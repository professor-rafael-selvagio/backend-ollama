import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { getDbPool, initializeDatabase } from "./config/database";

let server: ReturnType<typeof app.listen>;

async function start() {
  const pool = getDbPool();
  if (pool) {
    try {
      await initializeDatabase(pool);
    } catch (err) {
      logger.error("Erro ao aplicar sincronização inicial de tabelas do banco", err as Error);
    }
  }

  server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`🚀 Backend Seguro Ollama iniciado com sucesso!`, {
      port: env.PORT,
      environment: env.NODE_ENV,
      ollamaBaseUrl: env.OLLAMA_BASE_URL,
      allowedOrigins: env.ALLOWED_ORIGINS,
      allowedModels: env.ALLOWED_MODELS.length > 0 ? env.ALLOWED_MODELS : "TODOS (irrestrito)",
      authRequired: env.REQUIRE_AUTH,
    });
  });
}

start().catch((err) => {
  logger.error("Falha fatal na inicialização do servidor HTTP", err as Error);
  process.exit(1);
});

// Tratamento de encerramento gracioso (Graceful Shutdown)
function handleShutdown(signal: string) {
  logger.info(`Sinal de encerramento recebido (${signal}). Finalizando conexões pendentes...`);

  server.close(() => {
    logger.info("Servidor HTTP encerrado com sucesso.");
    process.exit(0);
  });

  // Força o encerramento após 10 segundos caso conexões fiquem presas
  setTimeout(() => {
    logger.error("Encerramento forçado por timeout de conexões pendentes.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

// Captura de exceções e rejeições não tratadas
process.on("uncaughtException", (error: Error) => {
  logger.error("Exceção não tratada capturada (uncaughtException)", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Rejeição de Promise não tratada (unhandledRejection)", reason as Error);
  process.exit(1);
});

