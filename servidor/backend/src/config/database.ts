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

/**
 * Executa as migrações automáticas e idempotentes para garantir que todas
 * as tabelas (users, projects, conversations, messages), colunas e índices existam.
 */
export async function initializeDatabase(pool: Pool): Promise<void> {
  logger.info("Verificando e sincronizando schema do PostgreSQL...");
  const migrationSql = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE SCHEMA IF NOT EXISTS auth;

    CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        password_hash text,
        raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        color text NOT NULL DEFAULT '#3B82F6',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
        title text NOT NULL DEFAULT 'Nova Conversa',
        model text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );

    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'project_id'
        ) THEN
            ALTER TABLE public.conversations ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
        END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS public.messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role text NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
        content text NOT NULL,
        tokens integer,
        created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON public.conversations(project_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
  `;

  await pool.query(migrationSql);
  logger.info("Schema do PostgreSQL sincronizado com sucesso!");
}

