import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";
import { SupabaseClient } from "@supabase/supabase-js";
import { authMiddleware, setSupabaseClientForTesting } from "../src/middlewares/auth.middleware";
import { aiRateLimiter } from "../src/middlewares/rate-limit.middleware";
import { errorHandler } from "../src/middlewares/error.middleware";
import { ForbiddenError } from "../src/utils/errors";
import { app } from "../src/app";

describe("Camada de Segurança e Middlewares", () => {
  afterEach(() => {
    setSupabaseClientForTesting(null);
    vi.restoreAllMocks();
  });

  describe("Middleware de Autenticação Supabase (auth.middleware)", () => {
    it("deve barrar requisições sem o header Authorization quando autenticação for obrigatória", async () => {
      const testApp = express();
      testApp.use(express.json());

      vi.mock("../src/config/env", () => ({
        env: {
          REQUIRE_AUTH: true,
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_ANON_KEY: "dummy-key",
          ALLOWED_ORIGINS: ["*"],
          ALLOWED_MODELS: [],
          NODE_ENV: "test",
        },
      }));

      testApp.get("/protected", authMiddleware, (_req, res) => {
        res.json({ message: "autorizado" });
      });
      testApp.use(errorHandler);

      const response = await request(testApp).get("/protected");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("deve barrar token com formato incorreto (sem prefixo Bearer)", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get("/protected", authMiddleware, (_req, res) => {
        res.json({ message: "autorizado" });
      });
      testApp.use(errorHandler);

      const response = await request(testApp)
        .get("/protected")
        .set("Authorization", "Basic 123456");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("deve validar token com sucesso quando o Supabase Auth confirmar o usuário", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-senai-123",
                email: "aluno@senai.br",
                role: "authenticated",
              },
            },
            error: null,
          }),
        },
      } as unknown as SupabaseClient;

      setSupabaseClientForTesting(mockSupabase);

      const testApp = express();
      testApp.use(express.json());
      testApp.get("/protected", authMiddleware, (req, res) => {
        res.json({ message: "autorizado", user: req.user });
      });
      testApp.use(errorHandler);

      const response = await request(testApp)
        .get("/protected")
        .set("Authorization", "Bearer token-valido-supabase");

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty("id", "user-senai-123");
      expect(response.body.user).toHaveProperty("email", "aluno@senai.br");
    });

    it("deve rejeitar com 401 quando o Supabase Auth retornar token inválido ou expirado", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Invalid or expired JWT" },
          }),
        },
      } as unknown as SupabaseClient;

      setSupabaseClientForTesting(mockSupabase);

      const testApp = express();
      testApp.use(express.json());
      testApp.get("/protected", authMiddleware, (_req, res) => {
        res.json({ message: "autorizado" });
      });
      testApp.use(errorHandler);

      const response = await request(testApp)
        .get("/protected")
        .set("Authorization", "Bearer token-expirado");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("code", "UNAUTHORIZED");
      expect(response.body.message).toContain("inválido ou expirado");
    });
  });

  describe("Middleware de Rate Limiting (aiRateLimiter)", () => {
    it("deve limitar o número de requisições disparando status 429", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.post("/generate", aiRateLimiter, (_req, res) => {
        res.json({ success: true });
      });

      let wasRateLimited = false;
      for (let i = 0; i < 25; i++) {
        const res = await request(testApp).post("/generate").send({});
        if (res.status === 429) {
          wasRateLimited = true;
          expect(res.body).toHaveProperty("code", "AI_RATE_LIMIT_EXCEEDED");
          break;
        }
      }

      expect(wasRateLimited).toBe(true);
    });
  });

  describe("Segurança HTTP e CORS", () => {
    it("deve bloquear requisição de origem não autorizada com status 403", async () => {
      const corsApp = express();
      corsApp.use(
        cors({
          origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const allowedOrigins = ["http://localhost:5173"];
            if (allowedOrigins.includes(origin)) {
              return callback(null, true);
            }
            return callback(new ForbiddenError("Origem não permitida pela política de CORS"), false);
          },
        })
      );
      corsApp.get("/test-cors", (_req, res) => res.json({ ok: true }));
      corsApp.use(errorHandler);

      const response = await request(corsApp)
        .get("/test-cors")
        .set("Origin", "http://origem-nao-autorizada.com");

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("code", "FORBIDDEN");
      expect(response.body.message).toContain("política de CORS");
    });

    it("deve incluir cabeçalhos de segurança do Helmet", async () => {
      const response = await request(app).get("/health");

      expect(response.headers).toHaveProperty("x-content-type-options", "nosniff");
      expect(response.headers).toHaveProperty("x-frame-options", "SAMEORIGIN");
    });
  });

  describe("Tratamento Centralizado de Erros", () => {
    it("deve retornar 404 padronizado para endpoint inexistente", async () => {
      const response = await request(app).get("/api/rota-inexistente-123");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        code: "NOT_FOUND",
        message: "Endpoint não encontrado",
      });
    });

    it("deve retornar 400 padronizado para corpo JSON malformado", async () => {
      const response = await request(app)
        .post("/api/ollama/generate")
        .set("Content-Type", "application/json")
        .send("{ corpo json invalido sem fechar ");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "INVALID_JSON_BODY");
    });
  });
});
