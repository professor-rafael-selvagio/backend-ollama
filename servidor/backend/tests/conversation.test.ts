import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  defaultConversationService,
  InMemoryConversationRepository,
} from "../src/services/conversation.service";

describe("Módulo de Persistência de Conversas e Histórico de Chat (/api/conversations)", () => {
  let memoryRepo: InMemoryConversationRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    memoryRepo = new InMemoryConversationRepository();
    defaultConversationService.setRepositoryForTesting(memoryRepo);
  });

  describe("POST /api/conversations (Criação de Chat)", () => {
    it("deve criar uma nova conversa com sucesso", async () => {
      const response = await request(app)
        .post("/api/conversations")
        .send({
          model: "llama3:8b",
          title: "Estudo de Docker e Redes",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe("Estudo de Docker e Redes");
      expect(response.body.model).toBe("llama3:8b");
      expect(response.body).toHaveProperty("created_at");
      expect(response.body).toHaveProperty("updated_at");
    });

    it("deve atribuir o título padrão 'Nova Conversa' quando não for especificado", async () => {
      const response = await request(app)
        .post("/api/conversations")
        .send({
          model: "llama3:8b",
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe("Nova Conversa");
    });

    it("deve retornar erro 400 se o modelo não for informado", async () => {
      const response = await request(app)
        .post("/api/conversations")
        .send({
          title: "Sem modelo",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("GET /api/conversations (Listagem de Chats)", () => {
    it("deve listar todas as conversas do usuário ordenadas por atualização recente", async () => {
      await request(app).post("/api/conversations").send({ model: "llama3:8b", title: "Chat 1" });
      await request(app).post("/api/conversations").send({ model: "llama3:8b", title: "Chat 2" });

      const response = await request(app).get("/api/conversations");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("total", 2);
      expect(response.body.conversations).toHaveLength(2);
      expect(response.body.conversations[0].title).toBe("Chat 2");
    });
  });

  describe("GET /api/conversations/:id (Detalhes e Mensagens)", () => {
    it("deve retornar os detalhes da conversa junto com o array de mensagens", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .send({ model: "llama3:8b", title: "Chat de Teste" });

      const convId = createRes.body.id;

      const response = await request(app).get(`/api/conversations/${convId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(convId);
      expect(response.body.title).toBe("Chat de Teste");
      expect(response.body).toHaveProperty("messages");
      expect(response.body.messages).toEqual([]);
    });

    it("deve retornar 404 para conversa inexistente", async () => {
      const response = await request(app).get("/api/conversations/id-inexistente-123");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code", "NOT_FOUND");
    });
  });

  describe("PATCH /api/conversations/:id (Renomeação de Chat)", () => {
    it("deve atualizar o título da conversa com sucesso", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .send({ model: "llama3:8b", title: "Título Antigo" });

      const convId = createRes.body.id;

      const updateRes = await request(app)
        .patch(`/api/conversations/${convId}`)
        .send({ title: "Título Atualizado" });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.title).toBe("Título Atualizado");

      // Confere persistência
      const getRes = await request(app).get(`/api/conversations/${convId}`);
      expect(getRes.body.title).toBe("Título Atualizado");
    });

    it("deve retornar erro 400 se o novo título for vazio", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .send({ model: "llama3:8b" });

      const convId = createRes.body.id;

      const updateRes = await request(app)
        .patch(`/api/conversations/${convId}`)
        .send({ title: "" });

      expect(updateRes.status).toBe(400);
      expect(updateRes.body).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("DELETE /api/conversations/:id (Exclusão de Chat)", () => {
    it("deve excluir a conversa e não permitir mais consultas subsequentes", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .send({ model: "llama3:8b", title: "Chat para Deletar" });

      const convId = createRes.body.id;

      const deleteRes = await request(app).delete(`/api/conversations/${convId}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body).toEqual({ success: true });

      const getRes = await request(app).get(`/api/conversations/${convId}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe("POST /api/conversations/:id/messages (Envio de Mensagem e Persistência)", () => {
    it("deve salvar a mensagem do usuário, consultar o Ollama e salvar a resposta da IA", async () => {
      // Mock da resposta do Ollama
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "llama3:8b",
          created_at: "2026-11-06T12:00:00Z",
          message: {
            role: "assistant",
            content: "Um container é uma unidade padrão de software que empacota código e dependências.",
          },
          done: true,
          eval_count: 42,
        }),
      } as unknown as Response);

      const createRes = await request(app)
        .post("/api/conversations")
        .send({ model: "llama3:8b" });

      const convId = createRes.body.id;

      const sendRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .send({
          content: "O que é um container?",
        });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body).toHaveProperty("userMessage");
      expect(sendRes.body.userMessage.role).toBe("user");
      expect(sendRes.body.userMessage.content).toBe("O que é um container?");

      expect(sendRes.body).toHaveProperty("assistantMessage");
      expect(sendRes.body.assistantMessage.role).toBe("assistant");
      expect(sendRes.body.assistantMessage.content).toContain("unidade padrão de software");

      // Verifica se ambas as mensagens foram salvas no histórico do chat
      const detailRes = await request(app).get(`/api/conversations/${convId}`);
      expect(detailRes.body.messages).toHaveLength(2);
      expect(detailRes.body.messages[0].role).toBe("user");
      expect(detailRes.body.messages[1].role).toBe("assistant");

      // Confere se o título foi automaticamente renomeado a partir da primeira pergunta
      expect(detailRes.body.title).toContain("O que é um container");
    });
  });
});

