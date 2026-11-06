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
import {
  defaultConversationService,
  InMemoryConversationRepository,
} from "../src/services/conversation.service";
import {
  defaultProjectService,
  InMemoryProjectRepository,
} from "../src/services/project.service";
import { getAuditService } from "../src/services/audit.service";

describe("Módulo Administrativo, Lixeira e Auditoria (/api/admin)", () => {
  let memoryAuth: InMemoryAuthService;
  let memoryAdmin: InMemoryAdminService;
  let memoryConvRepo: InMemoryConversationRepository;
  let memoryProjRepo: InMemoryProjectRepository;

  beforeEach(() => {
    memoryAuth = new InMemoryAuthService();
    memoryAdmin = new InMemoryAdminService(memoryAuth);
    memoryConvRepo = new InMemoryConversationRepository();
    memoryProjRepo = new InMemoryProjectRepository();

    defaultConversationService.setRepositoryForTesting(memoryConvRepo);
    defaultProjectService.setRepositoryForTesting(memoryProjRepo);

    setAuthServiceForTesting(memoryAuth);
    setAdminServiceForTesting(memoryAdmin);
  });

  afterEach(() => {
    memoryAuth.clear();
    memoryConvRepo.clear();
    memoryProjRepo.clear();
    vi.restoreAllMocks();
  });

  describe("Controle de Acesso às Rotas Administrativas", () => {
    it("deve rejeitar com 401 quando o cabeçalho Authorization não for enviado", async () => {
      const res = await request(app).get("/api/admin/metrics");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("deve rejeitar com 403 quando um usuário comum tentar acessar rotas de admin", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        email: "aluno@teste.com",
        password: "senhaSegura123",
        name: "Aluno Comum",
        user_type: "aluno",
        ra: "RA-COMUM-01",
      });

      const token = reg.body.data.session.access_token;

      // 1. /metrics
      const resMetrics = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${token}`);
      expect(resMetrics.status).toBe(403);

      // 2. /deleted
      const resDeleted = await request(app)
        .get("/api/admin/deleted")
        .set("Authorization", `Bearer ${token}`);
      expect(resDeleted.status).toBe(403);

      // 3. /restore
      const resRestore = await request(app)
        .post("/api/admin/restore")
        .set("Authorization", `Bearer ${token}`)
        .send({ resource_type: "conversation", resource_id: "fake-id" });
      expect(resRestore.status).toBe(403);

      // 4. /audit-logs
      const resLogs = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${token}`);
      expect(resLogs.status).toBe(403);
    });

    it("deve permitir acesso para o superadministrador rselvagio@sp.senai.br", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
        name: "Prof. Rafael Selvagio",
        user_type: "funcionario",
        nif: "NIF0001",
      });

      const token = reg.body.data.session.access_token;

      const res = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "success");
      expect(res.body.data).toHaveProperty("total_users");
      expect(res.body.data).toHaveProperty("total_alunos");
      expect(res.body.data).toHaveProperty("total_funcionarios");
      expect(res.body.data).toHaveProperty("online_users");
      expect(res.body.data).toHaveProperty("deleted_conversations");
      expect(res.body.data).toHaveProperty("deleted_projects");
    });
  });

  describe("GET /api/admin/users (Listagem com Perfil, RA/NIF e Status)", () => {
    it("deve listar todos os usuários com campos de identificação e status", async () => {
      // Cadastra admin funcionário
      const adminReg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
        name: "Prof. Rafael Selvagio",
        user_type: "funcionario",
        nif: "NIF-ADMIN",
      });
      const adminToken = adminReg.body.data.session.access_token;

      // Cadastra aluno
      await request(app).post("/api/auth/register").send({
        email: "aluno2@teste.com",
        password: "senhaSegura123",
        name: "Aluno 2",
        user_type: "aluno",
        ra: "RA-ALUNO-2",
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
      expect(adminUser.user_type).toBe("funcionario");
      expect(adminUser.nif).toBe("NIF-ADMIN");

      const studentUser = res.body.data.users.find(
        (u: { email: string }) => u.email === "aluno2@teste.com"
      );
      expect(studentUser).toBeDefined();
      expect(studentUser.user_type).toBe("aluno");
      expect(studentUser.ra).toBe("RA-ALUNO-2");
    });
  });

  describe("PATCH /api/admin/users/:id/role (Concessão e Revogação de Administrador)", () => {
    it("deve conceder permissão de administrador para um usuário e depois revogar", async () => {
      // Admin
      const adminReg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
        user_type: "funcionario",
        nif: "NIF-ADMIN-ROLE",
      });
      const adminToken = adminReg.body.data.session.access_token;

      // Aluno a ser promovido
      const userReg = await request(app).post("/api/auth/register").send({
        email: "promover@teste.com",
        password: "senhaSegura123",
        name: "Futuro Admin",
        user_type: "aluno",
        ra: "RA-PROMOVER",
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
        user_type: "funcionario",
        nif: "NIF-SUPER",
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
  });

  describe("Lixeira do Administrador & Exclusão Lógica (/api/admin/deleted e /restore)", () => {
    it("deve exibir itens excluídos logicamente na lixeira e permitir sua restauração", async () => {
      // 1. Cadastra Admin
      const adminReg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
        user_type: "funcionario",
        nif: "NIF-LIXEIRA",
      });
      const adminToken = adminReg.body.data.session.access_token;

      // 2. Cadastra Aluno
      const studentReg = await request(app).post("/api/auth/register").send({
        email: "aluno.lixeira@teste.com",
        password: "senhaSegura123",
        name: "Aluno Lixeira",
        user_type: "aluno",
        ra: "RA-LIXEIRA",
      });
      const studentToken = studentReg.body.data.session.access_token;
      const studentId = studentReg.body.data.user.id;

      // 3. Aluno cria conversa
      const conv = await memoryConvRepo.createConversation(
        studentId,
        "llama3.2:latest",
        "Conversa Importante"
      );

      // 4. Aluno deleta conversa (exclusão lógica)
      const delSuccess = await memoryConvRepo.deleteConversation(studentId, conv.id);
      expect(delSuccess).toBe(true);

      // 5. Conversa não deve mais aparecer na listagem do aluno
      const activeList = await memoryConvRepo.listConversations(studentId);
      expect(activeList.find((c) => c.id === conv.id)).toBeUndefined();

      // 6. Administrador consulta a aba da lixeira
      const deletedRes = await request(app)
        .get("/api/admin/deleted")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(deletedRes.status).toBe(200);
      expect(deletedRes.body).toHaveProperty("status", "success");
      const deletedItems = deletedRes.body.data.items;
      const foundDeleted = deletedItems.find(
        (i: { id: string }) => i.id === conv.id
      );
      expect(foundDeleted).toBeDefined();
      expect(foundDeleted.title).toBe("Conversa Importante");
      expect(foundDeleted.resource_type).toBe("conversation");
      expect(foundDeleted.user_email).toBe("aluno.lixeira@teste.com");

      // 7. Administrador restaura o item
      const restoreRes = await request(app)
        .post("/api/admin/restore")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          resource_type: "conversation",
          resource_id: conv.id,
        });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body).toHaveProperty("status", "success");

      // 8. Conversa volta a aparecer na listagem do aluno
      const restoredList = await memoryConvRepo.listConversations(studentId);
      expect(restoredList.find((c) => c.id === conv.id)).toBeDefined();
    });
  });

  describe("Trilha de Auditoria (/api/admin/audit-logs)", () => {
    it("deve registrar ações e listá-las para o administrador", async () => {
      // 1. Admin se cadastra e acessa logs
      const adminReg = await request(app).post("/api/auth/register").send({
        email: SUPERADMIN_EMAIL,
        password: "senhaSegura123",
        user_type: "funcionario",
        nif: "NIF-AUDIT",
      });
      const adminToken = adminReg.body.data.session.access_token;

      // 2. Consulta logs de auditoria
      const logsRes = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(logsRes.status).toBe(200);
      expect(logsRes.body).toHaveProperty("status", "success");
      expect(Array.isArray(logsRes.body.data.logs)).toBe(true);

      const logs = logsRes.body.data.logs;
      const registerLog = logs.find(
        (l: { action: string }) => l.action === "AUTH_REGISTER"
      );
      expect(registerLog).toBeDefined();
    });
  });

  describe("POST /api/auth/heartbeat", () => {
    it("deve registrar heartbeat de usuário autenticado retornando 200", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        email: "heartbeat@teste.com",
        password: "senhaSegura123",
        user_type: "aluno",
        ra: "RA-HEARTBEAT",
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
