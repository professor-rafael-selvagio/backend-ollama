import { Router } from "express";
import { defaultOllamaController } from "../controllers/ollama.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { aiRateLimiter } from "../middlewares/rate-limit.middleware";

export const ollamaRoutes = Router();

// Rota de status do serviço Ollama
ollamaRoutes.get("/status", defaultOllamaController.getStatus);

// Rota para listagem de modelos (protegida por autenticação)
ollamaRoutes.get("/models", authMiddleware, defaultOllamaController.getModels);

// Rota de geração de texto (protegida por autenticação e rate limiting de IA)
ollamaRoutes.post("/generate", authMiddleware, aiRateLimiter, defaultOllamaController.generate);

// Rota de conversação chat (protegida por autenticação e rate limiting de IA)
ollamaRoutes.post("/chat", authMiddleware, aiRateLimiter, defaultOllamaController.chat);

