import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  InMemoryAuthService,
  setAuthServiceForTesting,
} from "../src/services/auth.service";
import {
  InMemoryAdminService,
  setAdminServiceForTesting,
  SUPERADMIN_EMAIL,
} from "../src/services/admin.service";

describe("Módulo Administrativo e Métricas (/api/admin)", () => {
  let memoryAuth: InMemoryAuthService;
  let memoryAdmin: InMemoryAdminService;

  beforeEach(() => {
    memoryAuth = new InMemoryAuthService();
    memoryAdmin = new InMemoryAdminService(memoryAuth);
    setAuthServiceForTesting(memoryAuth);
    setAdminServiceForTesting(memoryAdmin);
  });

  afterEach(() => {
    memoryAuth.clear();
    vi.restoreAllMocks();
  });

  describe("Controle de Acesso às Rotas Administrativas", () => {
    it("deve rejeitar com 401 quando o cabeçalho Authorization não for enviado", async () => {
      const res = await request(app).get("/api/admin/metrics");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("deve rejeitar com 403 quando um usuário comum tentar acessar /api/admin/metrics", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        email: "aluno@teste.com",
        password: "senhaSegura123",
        name: "Aluno Comum",
      });

      const token = reg.body.data.session.access_token;

      const res = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("code", "FORBIDDEN");
      expect(res.body.message).toContain("exclusiva para administradores");
    });

    it("deve permitir acesso para o superadministrador rselvagio@sp.senai.br", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
        name: "Prof. Rafael Selvagio",
      });

      const token = reg.body.data.session.access_token;

      const res = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "success");
      expect(res.body.data).toHaveProperty("total_users");
      expect(res.body.data).toHaveProperty("online_users");
      expect(res.body.data).toHaveProperty("total_prompt_tokens");
      expect(res.body.data).toHaveProperty("total_completion_tokens");
    });
  });

  describe("GET /api/admin/users (Listagem e Status Online)", () => {
    it("deve listar todos os usuários com status online e atributos administrativos", async () => {
      // Cadastra admin
      const adminReg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
        name: "Prof. Rafael Selvagio",
      });
      const adminToken = adminReg.body.data.session.access_token;

      // Cadastra aluno
      await request(app).post("/api/auth/register").send({
        email: "aluno2@teste.com",
        password: "senhaSegura123",
        name: "Aluno 2",
      });

      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "success");
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBe(2);

      const adminUser = res.body.data.users.find(
        (u: { email: string }) => u.email === SUPERADMIN_EMAIL
      );
      expect(adminUser).toBeDefined();
      expect(adminUser.is_admin).toBe(true);
      expect(adminUser.is_online).toBe(true);
      expect(adminUser).toHaveProperty("total_prompt_tokens");
      expect(adminUser).toHaveProperty("total_completion_tokens");
    });
  });

  describe("PATCH /api/admin/users/:id/role (Concessão e Revogação de Administrador)", () => {
    it("deve conceder permissão de administrador para um usuário e depois revogar", async () => {
      // Admin
      const adminReg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
      });
      const adminToken = adminReg.body.data.session.access_token;

      // Aluno a ser promovido
      const userReg = await request(app).post("/api/auth/register").send({
        email: "promover@teste.com",
        password: "senhaSegura123",
        name: "Futuro Admin",
      });
      const targetUserId = userReg.body.data.user.id;

      // 1. Concede admin
      const promoteRes = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ is_admin: true });

      expect(promoteRes.status).toBe(200);
      expect(promoteRes.body).toHaveProperty("status", "success");
      expect(promoteRes.body.data.user.is_admin).toBe(true);

      // 2. Revoga admin
      const demoteRes = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ is_admin: false });

      expect(demoteRes.status).toBe(200);
      expect(demoteRes.body.data.user.is_admin).toBe(false);
    });

    it("não deve permitir revogar a permissão do superadministrador rselvagio@sp.senai.br", async () => {
      const adminReg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
      });
      const adminToken = adminReg.body.data.session.access_token;
      const superAdminId = adminReg.body.data.user.id;

      const res = await request(app)
        .patch(`/api/admin/users/${superAdminId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ is_admin: false });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Não é permitido revogar a permissão do administrador principal");
    });

    it("deve retornar 404 ao tentar atualizar papel de usuário inexistente", async () => {
      const adminReg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
      });
      const adminToken = adminReg.body.data.session.access_token;

      const res = await request(app)
        .patch("/api/admin/users/00000000-0000-0000-0000-000000000000/role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ is_admin: true });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/auth/heartbeat", () => {
    it("deve registrar heartbeat de usuário autenticado retornando 200", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        email: "heartbeat@teste.com",
        password: "senhaSegura123",
      });
      const token = reg.body.data.session.access_token;

      const res = await request(app)
        .post("/api/auth/heartbeat")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "success");
      expect(res.body.message).toContain("Heartbeat");
    });
  });
});
