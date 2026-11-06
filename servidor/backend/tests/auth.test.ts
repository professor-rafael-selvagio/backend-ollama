import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  InMemoryAuthService,
  setAuthServiceForTesting,
  SupabaseAuthService,
} from "../src/services/auth.service";
import { SupabaseClient } from "@supabase/supabase-js";

describe("Módulo de Autenticação (/api/auth)", () => {
  let memoryAuth: InMemoryAuthService;

  beforeEach(() => {
    memoryAuth = new InMemoryAuthService();
    setAuthServiceForTesting(memoryAuth);
  });

  afterEach(() => {
    memoryAuth.clear();
    vi.restoreAllMocks();
  });

  describe("POST /api/auth/register (Cadastro de Usuário)", () => {
    it("deve cadastrar um novo usuário com sucesso e retornar status 201 com dados e sessão", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "novo.usuario@teste.com",
          password: "senhaSegura123",
          name: "Novo Usuário",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("status", "success");
      expect(response.body.data.user).toHaveProperty("id");
      expect(response.body.data.user.email).toBe("novo.usuario@teste.com");
      expect(response.body.data.user.name).toBe("Novo Usuário");
      expect(response.body.data.session).toHaveProperty("access_token");
      expect(response.body.data.session).toHaveProperty("refresh_token");
    });

    it("deve rejeitar cadastro com e-mail duplicado retornando 400", async () => {
      await request(app).post("/api/auth/register").send({
        email: "duplicado@teste.com",
        password: "senhaSegura123",
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "duplicado@teste.com",
          password: "outraSenha123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body.message).toContain("já está cadastrado");
    });

    it("deve rejeitar e-mail inválido com erro 400", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "email-invalido",
          password: "senhaSegura123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body.details[0].message).toContain("Formato de e-mail inválido");
    });

    it("deve rejeitar senha com menos de 6 caracteres com erro 400", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "usuario@teste.com",
          password: "123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body.details[0].message).toContain("no mínimo 6 caracteres");
    });
  });

  describe("POST /api/auth/login (Login e Emissão de Token)", () => {
    beforeEach(async () => {
      await memoryAuth.register({
        email: "cadastrado@teste.com",
        password: "senhaCorreta123",
        name: "Cadastrado",
      });
    });

    it("deve autenticar usuário existente com credenciais corretas e retornar status 200", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "cadastrado@teste.com",
          password: "senhaCorreta123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "success");
      expect(response.body.data.user.email).toBe("cadastrado@teste.com");
      expect(response.body.data.session).toHaveProperty("access_token");
      expect(response.body.data.session.token_type).toBe("Bearer");
    });

    it("deve rejeitar login com senha incorreta retornando status 401", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "cadastrado@teste.com",
          password: "senhaErrada",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("code", "UNAUTHORIZED");
      expect(response.body.message).toContain("Credenciais de acesso inválidas");
    });

    it("deve rejeitar login com e-mail não existente retornando status 401", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "inexistente@teste.com",
          password: "senhaQualquer123",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("code", "UNAUTHORIZED");
    });
  });

  describe("POST /api/auth/refresh (Renovação de Sessão)", () => {
    it("deve renovar sessão quando fornecido um refresh_token válido", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          email: "refresh@teste.com",
          password: "senhaSegura123",
        });

      const refreshToken = registerRes.body.data.session.refresh_token;

      const refreshRes = await request(app)
        .post("/api/auth/refresh")
        .send({
          refresh_token: refreshToken,
        });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty("status", "success");
      expect(refreshRes.body.data.session).toHaveProperty("access_token");
      expect(refreshRes.body.data.session).toHaveProperty("refresh_token");
    });

    it("deve rejeitar refresh_token inválido retornando 401", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({
          refresh_token: "token-invalido",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("code", "UNAUTHORIZED");
    });
  });

  describe("GET /api/auth/me (Perfil do Usuário Autenticado)", () => {
    it("deve retornar o perfil do usuário logado através do token de acesso", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          email: "perfil@teste.com",
          password: "senhaSegura123",
          name: "Perfil Teste",
        });

      const token = registerRes.body.data.session.access_token;

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body).toHaveProperty("status", "success");
      expect(meRes.body.data.user).toHaveProperty("id");
    });
  });

  describe("SupabaseAuthService (Integração Direta com Supabase)", () => {
    it("deve disparar ValidationError quando o Supabase Auth falhar no registro", async () => {
      const mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: "User already registered" },
          }),
        },
      } as unknown as SupabaseClient;

      const supabaseAuth = new SupabaseAuthService(mockSupabase);

      await expect(
        supabaseAuth.register({
          email: "existente@supabase.com",
          password: "senhaSegura123",
        })
      ).rejects.toThrow("User already registered");
    });

    it("deve disparar UnauthorizedError quando o Supabase Auth falhar no login", async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: "Invalid login credentials" },
          }),
        },
      } as unknown as SupabaseClient;

      const supabaseAuth = new SupabaseAuthService(mockSupabase);

      await expect(
        supabaseAuth.login({
          email: "usuario@supabase.com",
          password: "senhaErrada",
        })
      ).rejects.toThrow("Invalid login credentials");
    });

    it("deve disparar UnauthorizedError quando o refreshSession falhar no Supabase", async () => {
      const mockSupabase = {
        auth: {
          refreshSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: { message: "Token expired" },
          }),
        },
      } as unknown as SupabaseClient;

      const supabaseAuth = new SupabaseAuthService(mockSupabase);

      await expect(
        supabaseAuth.refreshSession("token-expirado")
      ).rejects.toThrow("Refresh token inválido ou expirado.");
    });
  });
});
