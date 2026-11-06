import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { OllamaService } from "../src/services/ollama.service";

describe("Endpoints /api/ollama", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("GET /api/ollama/status", () => {
    it("deve retornar 200 e available: true quando o Ollama responde", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      } as unknown as Response);

      const response = await request(app).get("/api/ollama/status");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("available", true);
      expect(response.body).toHaveProperty("latencyMs");
    });

    it("deve retornar 503 e available: false quando o Ollama está inacessível", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      const response = await request(app).get("/api/ollama/status");

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty("status", "unavailable");
      expect(response.body).toHaveProperty("available", false);
    });
  });

  describe("GET /api/ollama/models", () => {
    it("deve listar os modelos retornados pelo Ollama", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: "llama3:8b", size: 4661224676 },
            { name: "mistral:7b", size: 4109865147 },
          ],
        }),
      } as unknown as Response);

      const response = await request(app).get("/api/ollama/models");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("total", 2);
      expect(response.body.models).toHaveLength(2);
      expect(response.body.models[0].name).toBe("llama3:8b");
    });
  });

  describe("POST /api/ollama/generate", () => {
    it("deve gerar texto com sucesso para uma requisição válida", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "llama3:8b",
          created_at: "2026-11-06T12:00:00Z",
          response: "Olá! Como posso ajudar você hoje?",
          done: true,
        }),
      } as unknown as Response);

      const response = await request(app)
        .post("/api/ollama/generate")
        .send({
          model: "llama3:8b",
          prompt: "Olá, apresente-se.",
          options: {
            temperature: 0.7,
            top_p: 0.9,
            repeat_penalty: 1.1,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("model", "llama3:8b");
      expect(response.body).toHaveProperty("response", "Olá! Como posso ajudar você hoje?");
      expect(response.body).toHaveProperty("done", true);
    });

    it("deve aceitar modelo com namespace complexo (ex: hf.co/bartowski/model:q4)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "hf.co/bartowski/Llama-3-8B-Instruct:Q4_K_M",
          created_at: "2026-11-06T12:00:00Z",
          response: "Resposta do modelo HuggingFace",
          done: true,
        }),
      } as unknown as Response);

      const response = await request(app)
        .post("/api/ollama/generate")
        .send({
          model: "hf.co/bartowski/Llama-3-8B-Instruct:Q4_K_M",
          prompt: "Teste",
        });

      expect(response.status).toBe(200);
      expect(response.body.model).toBe("hf.co/bartowski/Llama-3-8B-Instruct:Q4_K_M");
    });

    it("deve retornar erro 400 quando o prompt estiver ausente", async () => {
      const response = await request(app)
        .post("/api/ollama/generate")
        .send({
          model: "llama3:8b",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "prompt" }),
        ])
      );
    });

    it("deve retornar erro 400 para tentativa de SSRF com URL no nome do modelo", async () => {
      const response = await request(app)
        .post("/api/ollama/generate")
        .send({
          model: "http://malicious-host.com/model",
          prompt: "Olá",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("deve retornar erro 400 para tentativa de path traversal no nome do modelo", async () => {
      const response = await request(app)
        .post("/api/ollama/generate")
        .send({
          model: "../etc/passwd",
          prompt: "Olá",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("POST /api/ollama/chat", () => {
    it("deve processar conversação multi-turnos com sucesso", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "llama3:8b",
          created_at: "2026-11-06T12:00:00Z",
          message: {
            role: "assistant",
            content: "Com certeza, posso te explicar como funciona o Docker.",
          },
          done: true,
        }),
      } as unknown as Response);

      const response = await request(app)
        .post("/api/ollama/chat")
        .send({
          model: "llama3:8b",
          messages: [
            { role: "system", content: "Você é um assistente técnico educacional." },
            { role: "user", content: "O que é um container Docker?" },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message.role).toBe("assistant");
      expect(response.body.message.content).toContain("Docker");
    });

    it("deve aceitar mensagens de chat com imagens base64 válidas", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "llava:7b",
          created_at: "2026-11-06T12:00:00Z",
          message: {
            role: "assistant",
            content: "Esta imagem mostra um painel elétrico industrial.",
          },
          done: true,
        }),
      } as unknown as Response);

      const response = await request(app)
        .post("/api/ollama/chat")
        .send({
          model: "llava:7b",
          messages: [
            {
              role: "user",
              content: "Descreva esta imagem:",
              images: ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="],
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.message.content).toContain("painel elétrico");
    });

    it("deve retornar erro 400 quando a lista de mensagens for vazia", async () => {
      const response = await request(app)
        .post("/api/ollama/chat")
        .send({
          model: "llama3:8b",
          messages: [],
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("deve retornar erro 400 para papel de mensagem inválido", async () => {
      const response = await request(app)
        .post("/api/ollama/chat")
        .send({
          model: "llama3:8b",
          messages: [{ role: "hacker", content: "teste" }],
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("Validação de Modelos Permitidos (ALLOWED_MODELS)", () => {
    it("deve validar corretamente correspondências exatas e variações de :latest", () => {
      const service = new OllamaService(
        "http://localhost:11434",
        120000,
        ["llama3:8b", "mistral:latest", "qwen"]
      );

      // Correspondência exata
      expect(service.isModelAllowed("llama3:8b")).toBe(true);

      // Correspondência de tag :latest implícita
      expect(service.isModelAllowed("mistral")).toBe(true);
      expect(service.isModelAllowed("mistral:latest")).toBe(true);

      // Whitelist sem tag permite qualquer tag do mesmo modelo base
      expect(service.isModelAllowed("qwen:1.5b")).toBe(true);
      expect(service.isModelAllowed("qwen:7b")).toBe(true);

      // Modelo não autorizado
      expect(service.isModelAllowed("prohibited-model:latest")).toBe(false);
      expect(service.isModelAllowed("llama3:70b")).toBe(false);
    });

    it("deve bloquear modelo não autorizado com erro 403", async () => {
      const restrictedService = new OllamaService(
        "http://localhost:11434",
        120000,
        ["llama3:8b"]
      );

      await expect(
        restrictedService.generate({
          model: "prohibited-model:latest",
          prompt: "teste",
        })
      ).rejects.toThrow("não está autorizado");
    });
  });

  describe("Timeout do Ollama", () => {
    it("deve lançar TimeoutError (504) se a requisição estourar o limite de tempo", async () => {
      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              const abortErr = new Error("The operation was aborted");
              abortErr.name = "AbortError";
              reject(abortErr);
            });
          }
        });
      });

      const fastTimeoutService = new OllamaService("http://localhost:11434", 100);

      await expect(
        fastTimeoutService.generate({
          model: "llama3:8b",
          prompt: "requisição demorada",
        })
      ).rejects.toThrow("Tempo limite excedido");
    });
  });
});
