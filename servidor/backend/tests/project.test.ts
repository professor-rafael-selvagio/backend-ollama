import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  InMemoryProjectRepository,
  defaultProjectService,
} from "../src/services/project.service";
import {
  InMemoryConversationRepository,
  defaultConversationService,
} from "../src/services/conversation.service";
import { defaultOllamaService } from "../src/services/ollama.service";

describe("Módulo de Projetos (/api/projects)", () => {
  let projectRepo: InMemoryProjectRepository;
  let convRepo: InMemoryConversationRepository;

  beforeEach(() => {
    projectRepo = new InMemoryProjectRepository();
    convRepo = new InMemoryConversationRepository();
    defaultProjectService.setRepositoryForTesting(projectRepo);
    defaultConversationService.setRepositoryForTesting(convRepo);
    vi.spyOn(defaultOllamaService, "isModelAllowed").mockReturnValue(true);
  });

  afterEach(() => {
    projectRepo.clear();
    convRepo.clear();
    vi.restoreAllMocks();
  });

  describe("POST /api/projects (Criação de Projeto)", () => {
    it("deve criar um novo projeto com sucesso e retornar status 201", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          name: "Projeto Inteligência Artificial",
          description: "Estudos de LLM e Ollama",
          color: "#10B981",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Projeto Inteligência Artificial");
      expect(response.body.description).toBe("Estudos de LLM e Ollama");
      expect(response.body.color).toBe("#10B981");
      expect(response.body).toHaveProperty("created_at");
    });

    it("deve rejeitar projeto com nome vazio retornando 400", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          name: "   ",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("deve rejeitar projeto com cor inválida retornando 400", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          name: "Projeto Teste",
          color: "cor-nao-hex",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("GET /api/projects (Listagem de Projetos)", () => {
    it("deve listar os projetos criados pelo usuário ordenados por atualização", async () => {
      await request(app).post("/api/projects").send({ name: "Projeto A" });
      await request(app).post("/api/projects").send({ name: "Projeto B" });

      const response = await request(app).get("/api/projects");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("projects");
      expect(response.body.total).toBe(2);
      expect(response.body.projects[0].name).toBe("Projeto B");
    });
  });

  describe("GET /api/projects/:id (Detalhes com Conversas)", () => {
    it("deve retornar o projeto e a lista de chats agrupados dentro dele", async () => {
      const projRes = await request(app).post("/api/projects").send({
        name: "Projeto Robótica",
      });
      const projectId = projRes.body.id;

      // Cria um chat vinculado a este projeto
      await request(app).post("/api/conversations").send({
        model: "qwen2.5:3b",
        title: "Chat do Projeto",
        project_id: projectId,
      });

      // Cria outro chat sem projeto (geral)
      await request(app).post("/api/conversations").send({
        model: "qwen2.5:3b",
        title: "Chat Avulso",
      });

      const response = await request(app).get(`/api/projects/${projectId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(projectId);
      expect(response.body.name).toBe("Projeto Robótica");
      expect(response.body.conversations).toHaveLength(1);
      expect(response.body.conversations[0].title).toBe("Chat do Projeto");
    });

    it("deve retornar 404 para projeto não existente", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app).get(`/api/projects/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code", "NOT_FOUND");
    });
  });

  describe("PATCH /api/projects/:id (Atualização de Projeto)", () => {
    it("deve atualizar nome e cor do projeto", async () => {
      const projRes = await request(app).post("/api/projects").send({
        name: "Nome Antigo",
        color: "#3B82F6",
      });
      const projectId = projRes.body.id;

      const updateRes = await request(app)
        .patch(`/api/projects/${projectId}`)
        .send({
          name: "Nome Atualizado",
          color: "#EF4444",
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe("Nome Atualizado");
      expect(updateRes.body.color).toBe("#EF4444");
    });
  });

  describe("DELETE /api/projects/:id (Exclusão de Projeto)", () => {
    it("deve excluir o projeto com sucesso", async () => {
      const projRes = await request(app).post("/api/projects").send({
        name: "Projeto a Deletar",
      });
      const projectId = projRes.body.id;

      const deleteRes = await request(app).delete(`/api/projects/${projectId}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const getRes = await request(app).get(`/api/projects/${projectId}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe("Filtragem de Conversas por Projeto (/api/conversations?projectId=...)", () => {
    it("deve permitir filtrar conversas por projeto e listar apenas chats sem projeto", async () => {
      const projRes = await request(app).post("/api/projects").send({
        name: "Projeto Filtro",
      });
      const projectId = projRes.body.id;

      // 1 chat no projeto
      await request(app).post("/api/conversations").send({
        model: "qwen2.5:3b",
        title: "Chat no Projeto",
        project_id: projectId,
      });

      // 1 chat avulso
      await request(app).post("/api/conversations").send({
        model: "qwen2.5:3b",
        title: "Chat Geral Sem Projeto",
      });

      // Busca apenas do projeto
      const projFilterRes = await request(app).get(
        `/api/conversations?projectId=${projectId}`
      );
      expect(projFilterRes.status).toBe(200);
      expect(projFilterRes.body.conversations).toHaveLength(1);
      expect(projFilterRes.body.conversations[0].title).toBe("Chat no Projeto");

      // Busca apenas sem projeto
      const nullFilterRes = await request(app).get(
        "/api/conversations?projectId=null"
      );
      expect(nullFilterRes.status).toBe(200);
      expect(nullFilterRes.body.conversations).toHaveLength(1);
      expect(nullFilterRes.body.conversations[0].title).toBe("Chat Geral Sem Projeto");
    });
  });
});
