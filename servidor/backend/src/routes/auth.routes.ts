import { Router } from "express";
import { defaultAuthController } from "../controllers/auth.controller";
import { authRateLimiter } from "../middlewares/rate-limit.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";

export const authRoutes = Router();

// Rotas públicas com proteção de rate limit contra força bruta
authRoutes.post("/register", authRateLimiter, defaultAuthController.register);
authRoutes.post("/login", authRateLimiter, defaultAuthController.login);
authRoutes.post("/refresh", authRateLimiter, defaultAuthController.refresh);

// Rota protegida para consultar perfil do usuário autenticado
authRoutes.get("/me", authMiddleware, defaultAuthController.me);

