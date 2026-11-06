import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * Limitador geral para endpoints da API
 */
export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    code: "RATE_LIMIT_EXCEEDED",
    message: "Limite de requisições excedido. Por favor, tente novamente mais tarde.",
  },
});

/**
 * Limitador restritivo para rotas de geração e inferência de IA (evita sobrecarga de GPU/CPU)
 */
export const aiRateLimiter = rateLimit({
  windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  max: env.AI_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    code: "AI_RATE_LIMIT_EXCEEDED",
    message: "Limite de gerações de inteligência artificial atingido para este período.",
  },
});

/**
 * Limitador estrito para rotas de autenticação (evita força bruta de senhas e abusos de registro)
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 tentativas por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    message: "Muitas tentativas de autenticação. Por favor, aguarde um minuto e tente novamente.",
  },
});


