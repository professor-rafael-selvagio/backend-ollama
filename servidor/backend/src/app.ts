import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { generalRateLimiter } from "./middlewares/rate-limit.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { healthRoutes } from "./routes/health.routes";
import { ollamaRoutes } from "./routes/ollama.routes";
import { conversationRoutes } from "./routes/conversation.routes";
import { projectRoutes } from "./routes/project.routes";
import { authRoutes } from "./routes/auth.routes";
import { ForbiddenError, NotFoundError } from "./utils/errors";

export function createApp(): Express {
  const app = express();

  // 1. Segurança de Cabeçalhos HTTP com Helmet
  app.use(helmet());

  // 2. Configuração de CORS com origens restritas
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permite requisições sem origin (como ferramentas curl, mobile ou server-to-server)
        if (!origin) return callback(null, true);

        // Se wildcard estiver configurado ou a origem constar na lista
        if (env.ALLOWED_ORIGINS.includes("*") || env.ALLOWED_ORIGINS.includes(origin)) {
          return callback(null, true);
        }

        logger.warn("Requisição bloqueada por política de CORS", { origin });
        return callback(new ForbiddenError("Origem não permitida pela política de CORS"), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // 3. Limite de tamanho de payload para prevenir Denial of Service
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  // 4. Middleware de Log Estruturado de Requisições
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      });
    });
    next();
  });

  // 5. Rate Limiting Geral para rotas de API
  app.use("/api", generalRateLimiter);

  // 6. Registro de Rotas
  app.use("/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/ollama", ollamaRoutes);
  app.use("/api/conversations", conversationRoutes);

  // 7. Rota não encontrada (404)
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError("Endpoint não encontrado"));
  });

  // 8. Middleware Centralizado de Tratamento de Erros
  app.use(errorHandler);

  return app;
}

export const app = createApp();

