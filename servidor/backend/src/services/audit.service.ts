import { Pool } from "pg";
import { getDbPool } from "../config/database";
import { env } from "../config/env";
import { AuditLogEntry } from "../types";
import { logger } from "../utils/logger";

export interface CreateAuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export interface IAuditService {
  log(entry: CreateAuditLogInput): Promise<void>;
  getLogs(limit?: number, offset?: number): Promise<AuditLogEntry[]>;
}

/**
 * Serviço de auditoria conectado ao PostgreSQL
 */
export class PostgresAuditService implements IAuditService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async log(entry: CreateAuditLogInput): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO public.audit_logs 
         (user_id, user_email, action, resource_type, resource_id, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          entry.userId ?? null,
          entry.userEmail ?? null,
          entry.action,
          entry.resourceType,
          entry.resourceId ?? null,
          entry.details ? JSON.stringify(entry.details) : "{}",
          entry.ipAddress ?? null,
        ]
      );
    } catch (err) {
      logger.error("Falha ao registrar log de auditoria no PostgreSQL", err as Error);
    }
  }

  public async getLogs(limit = 100, offset = 0): Promise<AuditLogEntry[]> {
    const res = await this.pool.query(
      `SELECT id, user_id, user_email, action, resource_type, resource_id, details, ip_address, created_at
       FROM public.audit_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      user_email: row.user_email,
      action: row.action,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      details: row.details,
      ip_address: row.ip_address,
      created_at: new Date(row.created_at).toISOString(),
    }));
  }
}

/**
 * Serviço de auditoria em memória para testes e modo offline
 */
export class InMemoryAuditService implements IAuditService {
  private logs: AuditLogEntry[] = [];

  public async log(entry: CreateAuditLogInput): Promise<void> {
    this.logs.unshift({
      id: crypto.randomUUID(),
      user_id: entry.userId ?? null,
      user_email: entry.userEmail ?? null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      details: entry.details,
      ip_address: entry.ipAddress ?? null,
      created_at: new Date().toISOString(),
    });
  }

  public async getLogs(limit = 100, offset = 0): Promise<AuditLogEntry[]> {
    return this.logs.slice(offset, offset + limit);
  }

  public clear(): void {
    this.logs = [];
  }
}

let defaultAuditServiceInstance: IAuditService;

function createDefaultAuditService(): IAuditService {
  if (env.DATABASE_URL) {
    const pool = getDbPool();
    if (pool) {
      return new PostgresAuditService(pool);
    }
  }
  return new InMemoryAuditService();
}

export function getAuditService(): IAuditService {
  if (!defaultAuditServiceInstance) {
    defaultAuditServiceInstance = createDefaultAuditService();
  }
  return defaultAuditServiceInstance;
}

export function setAuditServiceForTesting(service: IAuditService): void {
  defaultAuditServiceInstance = service;
}

