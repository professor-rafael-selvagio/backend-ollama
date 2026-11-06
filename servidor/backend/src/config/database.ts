import { Pool } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

let poolInstance: Pool | null = null;

if (env.DATABASE_URL) {
  try {
    poolInstance = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on("error", (err) => {
      logger.error("Erro inesperado no pool do PostgreSQL", err);
    });

    logger.info("Pool de conexão PostgreSQL inicializado com sucesso.");
  } catch (err) {
    logger.error("Falha ao inicializar pool do PostgreSQL", err as Error);
  }
}

export function getDbPool(): Pool | null {
  return poolInstance;
}

export function setDbPoolForTesting(pool: Pool | null): void {
  poolInstance = pool;
}

