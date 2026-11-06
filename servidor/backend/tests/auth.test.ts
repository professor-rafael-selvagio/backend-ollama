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

  describe("POST /api/auth/register (Cadastro de Usuário - Aluno e Funcionário)", () => {
    it("deve cadastrar um novo aluno com RA com sucesso e retornar status 201", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "aluno.ra@teste.com",
          password: "senhaSegura123",
          name: "Aluno Com RA",
          user_type: "aluno",
          ra: "RA123456",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("status", "success");
      expect(response.body.data.user).toHaveProperty("id");
      expect(response.body.data.user.email).toBe("aluno.ra@teste.com");
      expect(response.body.data.user.name).toBe("Aluno Com RA");
      expect(response.body.data.user.user_type).toBe("aluno");
      expect(response.body.data.user.ra).toBe("RA123456");
      expect(response.body.data.session).toHaveProperty("access_token");
      expect(response.body.data.session).toHaveProperty("refresh_token");
    });

    it("deve cadastrar um novo aluno com CPF com sucesso e retornar status 201", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "aluno.cpf@teste.com",
          password: "senhaSegura123",
          name: "Aluno Com CPF",
          user_type: "aluno",
          cpf: "123.456.789-00",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("status", "success");
      expect(response.body.data.user.cpf).toBe("123.456.789-00");
      expect(response.body.data.user.user_type).toBe("aluno");
    });

    it("deve cadastrar um novo funcionário com NIF com sucesso e retornar status 201", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "func.nif@teste.com",
          password: "senhaSegura123",
          name: "Funcionario Com NIF",
          user_type: "funcionario",
          nif: "NIF998877",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("status", "success");
      expect(response.body.data.user.user_type).toBe("funcionario");
      expect(response.body.data.user.nif).toBe("NIF998877");
    });

    it("deve rejeitar aluno sem RA e sem CPF com erro 400", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "sem.documento@teste.com",
          password: "senhaSegura123",
          name: "Aluno Sem Documento",
          user_type: "aluno",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body.details[0].message).toContain("Alunos devem obrigatoriamente informar o RA ou o CPF");
    });

    it("deve rejeitar funcionário sem NIF com erro 400", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "func.sem.nif@teste.com",
          password: "senhaSegura123",
          name: "Func Sem NIF",
          user_type: "funcionario",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body.details[0].message).toContain("NIF é obrigatório para funcionários");
    });

    it("deve rejeitar cadastro com RA duplicado retornando 400", async () => {
      await request(app).post("/api/auth/register").send({
        email: "primeiro.ra@teste.com",
        password: "senhaSegura123",
        user_type: "aluno",
        ra: "RA-IDENTICO",
      });

      const response = await request(app).post("/api/auth/register").send({
        email: "segundo.ra@teste.com",
        password: "senhaSegura123",
        user_type: "aluno",
        ra: "RA-IDENTICO",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Já existe um usuário cadastrado com este RA");
    });

    it("deve rejeitar cadastro com CPF duplicado retornando 400", async () => {
      await request(app).post("/api/auth/register").send({
        email: "primeiro.cpf@teste.com",
        password: "senhaSegura123",
        user_type: "aluno",
        cpf: "111.222.333-44",
      });

      const response = await request(app).post("/api/auth/register").send({
        email: "segundo.cpf@teste.com",
        password: "senhaSegura123",
        user_type: "aluno",
        cpf: "111.222.333-44",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Já existe um usuário cadastrado com este CPF");
    });

    it("deve rejeitar cadastro com NIF duplicado retornando 400", async () => {
      await request(app).post("/api/auth/register").send({
        email: "primeiro.nif@teste.com",
        password: "senhaSegura123",
        user_type: "funcionario",
        nif: "NIF-IDENTICO",
      });

      const response = await request(app).post("/api/auth/register").send({
        email: "segundo.nif@teste.com",
        password: "senhaSegura123",
        user_type: "funcionario",
        nif: "NIF-IDENTICO",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Já existe um usuário cadastrado com este NIF");
    });

    it("deve rejeitar cadastro com e-mail duplicado retornando 400", async () => {
      await request(app).post("/api/auth/register").send({
        email: "duplicado@teste.com",
        password: "senhaSegura123",
        ra: "RA001",
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "duplicado@teste.com",
          password: "outraSenha123",
          ra: "RA002",
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
          ra: "RA999",
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
          ra: "RA888",
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
        user_type: "aluno",
        ra: "RA-LOGIN",
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
      expect(response.body.data.user.ra).toBe("RA-LOGIN");
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
          ra: "RA-REFRESH",
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
    it("deve retornar o perfil do usuário logado através do token de acesso com o nome", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          email: "perfil@teste.com",
          password: "senhaSegura123",
          name: "Perfil Teste",
          ra: "RA-PERFIL",
        });

      const token = registerRes.body.data.session.access_token;

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body).toHaveProperty("status", "success");
      expect(meRes.body.data.user).toHaveProperty("id");
      expect(meRes.body.data.user.email).toBe("perfil@teste.com");
      expect(meRes.body.data.user.name).toBe("Perfil Teste");
      expect(meRes.body.data.user.ra).toBe("RA-PERFIL");
    });
  });

  describe("PATCH /api/auth/profile (Atualização de Nome do Usuário)", () => {
    it("deve atualizar o nome do usuário com sucesso e refletir em /me", async () => {
      const reg = await request(app)
        .post("/api/auth/register")
        .send({
          email: "atualiza.nome@teste.com",
          password: "senhaSegura123",
          name: "Nome Antigo",
          ra: "RA-NOME",
        });

      const token = reg.body.data.session.access_token;

      const updateRes = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Nome Novo Atualizado",
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body).toHaveProperty("status", "success");
      expect(updateRes.body.data.user.name).toBe("Nome Novo Atualizado");

      // Verifica se /me agora retorna o novo nome
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.name).toBe("Nome Novo Atualizado");
    });

    it("deve rejeitar nome vazio ou com menos de 2 caracteres retornando 400", async () => {
      const reg = await request(app)
        .post("/api/auth/register")
        .send({
          email: "nome.invalido@teste.com",
          password: "senhaSegura123",
          ra: "RA-INVALID",
        });

      const token = reg.body.data.session.access_token;

      const updateRes = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "A",
        });

      expect(updateRes.status).toBe(400);
      expect(updateRes.body).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("deve rejeitar requisição sem autenticação retornando 401", async () => {
      const updateRes = await request(app)
        .patch("/api/auth/profile")
        .send({
          name: "Novo Nome",
        });

      expect(updateRes.status).toBe(401);
    });
  });

  describe("POST /api/auth/change-password (Troca de Senha)", () => {
    it("deve alterar a senha com sucesso quando fornecida a senha atual correta", async () => {
      const reg = await request(app)
        .post("/api/auth/register")
        .send({
          email: "troca.senha@teste.com",
          password: "senhaAtual123",
          name: "Troca Senha",
          ra: "RA-PASS",
        });

      const token = reg.body.data.session.access_token;

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "senhaAtual123",
          newPassword: "novaSenhaSegura456",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body).toHaveProperty("status", "success");
      expect(changeRes.body.message).toContain("sucesso");

      // Verifica se login com a nova senha funciona
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "troca.senha@teste.com",
          password: "novaSenhaSegura456",
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.email).toBe("troca.senha@teste.com");
    });

    it("deve rejeitar troca de senha com 401 se a senha atual estiver incorreta", async () => {
      const reg = await request(app)
        .post("/api/auth/register")
        .send({
          email: "senha.errada@teste.com",
          password: "senhaCorretaOriginal",
          ra: "RA-PASS2",
        });

      const token = reg.body.data.session.access_token;

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "senhaErradaQualquer",
          newPassword: "novaSenhaValida123",
        });

      expect(changeRes.status).toBe(401);
      expect(changeRes.body).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("deve rejeitar troca de senha com 400 se a nova senha tiver menos de 6 caracteres", async () => {
      const reg = await request(app)
        .post("/api/auth/register")
        .send({
          email: "senha.curta@teste.com",
          password: "senhaAtual123",
          ra: "RA-PASS3",
        });

      const token = reg.body.data.session.access_token;

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "senhaAtual123",
          newPassword: "123",
        });

      expect(changeRes.status).toBe(400);
      expect(changeRes.body).toHaveProperty("code", "VALIDATION_ERROR");
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
          ra: "RA-SUPA",
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
