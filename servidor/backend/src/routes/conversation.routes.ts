import { Router } from "express";
import { defaultConversationController } from "../controllers/conversation.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { aiRateLimiter } from "../middlewares/rate-limit.middleware";

export const conversationRoutes = Router();

// Todas as rotas de conversas exigem autenticação do usuário
conversationRoutes.use(authMiddleware);

// Criação e Listagem de Conversas
conversationRoutes.post("/", defaultConversationController.create);
conversationRoutes.get("/", defaultConversationController.list);

// Obtenção de histórico, renomeação e exclusão
conversationRoutes.get("/:id", defaultConversationController.getById);
conversationRoutes.patch("/:id", defaultConversationController.rename);
conversationRoutes.delete("/:id", defaultConversationController.delete);

// Envio de nova mensagem com persistência e inferência no Ollama
conversationRoutes.post("/:id/messages", aiRateLimiter, defaultConversationController.sendMessage);

