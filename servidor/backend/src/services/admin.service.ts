import { Pool } from "pg";
import { getDbPool } from "../config/database";
import { env } from "../config/env";
import { AdminMetricsResponse, AdminUserSummary } from "../types";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import { getAuthService, InMemoryAuthService } from "./auth.service";
import { defaultConversationService } from "./conversation.service";

export const SUPERADMIN_EMAIL = "rselvagio@sp.senai.br";

export interface IAdminService {
  getMetrics(): Promise<AdminMetricsResponse>;
  getUsers(): Promise<AdminUserSummary[]>;
  updateUserRole(
    adminUserId: string,
    targetUserId: string,
    isAdmin: boolean
  ): Promise<AdminUserSummary>;
}

/**
 * Implementação do serviço administrativo conectado ao PostgreSQL
 */
export class PostgresAdminService implements IAdminService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async getMetrics(): Promise<AdminMetricsResponse> {
    const usersCountRes = await this.pool.query(
      `SELECT 
         count(*)::int as total_users,
         count(*) FILTER (WHERE last_seen_at >= now() - interval '3 minutes')::int as online_users
       FROM auth.users`
    );

    const convCountRes = await this.pool.query(
      "SELECT count(*)::int as total_conversations FROM public.conversations"
    );

    const messagesRes = await this.pool.query(
      `SELECT 
         count(*)::int as total_messages,
         COALESCE(sum(prompt_tokens), 0)::int as total_prompt_tokens,
         COALESCE(sum(COALESCE(completion_tokens, tokens, 0)), 0)::int as total_completion_tokens
       FROM public.messages`
    );

    const totalUsers = usersCountRes.rows[0]?.total_users || 0;
    const onlineUsers = usersCountRes.rows[0]?.online_users || 0;
    const totalConversations = convCountRes.rows[0]?.total_conversations || 0;
    const totalMessages = messagesRes.rows[0]?.total_messages || 0;
    const totalPromptTokens = messagesRes.rows[0]?.total_prompt_tokens || 0;
    const totalCompletionTokens = messagesRes.rows[0]?.total_completion_tokens || 0;

    return {
      total_users: totalUsers,
      online_users: onlineUsers,
      total_conversations: totalConversations,
      total_messages: totalMessages,
      total_prompt_tokens: totalPromptTokens,
      total_completion_tokens: totalCompletionTokens,
      total_tokens: totalPromptTokens + totalCompletionTokens,
    };
  }

  public async getUsers(): Promise<AdminUserSummary[]> {
    const res = await this.pool.query(
      `SELECT 
         u.id,
         COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name,
         u.email,
         u.is_admin,
         u.created_at,
         u.last_seen_at,
         (u.last_seen_at >= now() - interval '3 minutes') as is_online,
         COUNT(DISTINCT c.id)::int as total_conversations,
         COUNT(DISTINCT m.id)::int as total_messages,
         COALESCE(SUM(m.prompt_tokens), 0)::int as total_prompt_tokens,
         COALESCE(SUM(COALESCE(m.completion_tokens, m.tokens, 0)), 0)::int as total_completion_tokens
       FROM auth.users u
       LEFT JOIN public.conversations c ON c.user_id = u.id
       LEFT JOIN public.messages m ON m.user_id = u.id
       GROUP BY u.id, u.email, u.raw_user_meta_data, u.is_admin, u.created_at, u.last_seen_at
       ORDER BY (u.last_seen_at >= now() - interval '3 minutes') DESC, u.created_at DESC`
    );

    return res.rows.map((row) => {
      const isSuperAdmin = row.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
      const isAdmin = Boolean(isSuperAdmin || row.is_admin);
      const promptTokens = Number(row.total_prompt_tokens) || 0;
      const completionTokens = Number(row.total_completion_tokens) || 0;

      return {
        id: row.id,
        name: row.name || row.email,
        email: row.email,
        is_admin: isAdmin,
        is_online: Boolean(row.is_online),
        last_seen_at: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : new Date().toISOString(),
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        total_conversations: Number(row.total_conversations) || 0,
        total_messages: Number(row.total_messages) || 0,
        total_prompt_tokens: promptTokens,
        total_completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      };
    });
  }

  public async updateUserRole(
    _adminUserId: string,
    targetUserId: string,
    isAdmin: boolean
  ): Promise<AdminUserSummary> {
    const userCheck = await this.pool.query(
      "SELECT id, email, is_admin FROM auth.users WHERE id = $1 LIMIT 1",
      [targetUserId]
    );

    if (!userCheck.rowCount || userCheck.rowCount === 0) {
      throw new NotFoundError("Usuário alvo não encontrado.");
    }

    const targetUser = userCheck.rows[0];
    if (
      targetUser.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() &&
      !isAdmin
    ) {
      throw new ForbiddenError(
        `Não é permitido revogar a permissão do administrador principal (${SUPERADMIN_EMAIL}).`
      );
    }

    await this.pool.query(
      "UPDATE auth.users SET is_admin = $1, updated_at = now() WHERE id = $2",
      [isAdmin, targetUserId]
    );

    const allUsers = await this.getUsers();
    const updated = allUsers.find((u) => u.id === targetUserId);
    if (!updated) {
      throw new NotFoundError("Erro ao recuperar usuário atualizado.");
    }
    return updated;
  }
}

/**
 * Implementação em memória para testes e modo offline
 */
export class InMemoryAdminService implements IAdminService {
  private inMemoryAuth: InMemoryAuthService;

  constructor(authService: InMemoryAuthService) {
    this.inMemoryAuth = authService;
  }

  public async getMetrics(): Promise<AdminMetricsResponse> {
    const users = this.inMemoryAuth.getUsersList();
    const now = Date.now();
    const threeMinMs = 3 * 60 * 1000;

    let onlineUsers = 0;
    for (const u of users) {
      if (u.last_seen_at && now - new Date(u.last_seen_at).getTime() <= threeMinMs) {
        onlineUsers++;
      }
    }

    return {
      total_users: users.length,
      online_users: onlineUsers,
      total_conversations: 0,
      total_messages: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0,
    };
  }

  public async getUsers(): Promise<AdminUserSummary[]> {
    const users = this.inMemoryAuth.getUsersList();
    const now = Date.now();
    const threeMinMs = 3 * 60 * 1000;

    return users.map((u) => {
      const isOnline = Boolean(
        u.last_seen_at && now - new Date(u.last_seen_at).getTime() <= threeMinMs
      );
      const isSuperAdmin = u.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
      const isAdmin = Boolean(isSuperAdmin || u.is_admin);

      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        is_admin: isAdmin,
        is_online: isOnline,
        last_seen_at: u.last_seen_at || new Date().toISOString(),
        created_at: u.created_at || new Date().toISOString(),
        total_conversations: 0,
        total_messages: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
      };
    });
  }

  public async updateUserRole(
    _adminUserId: string,
    targetUserId: string,
    isAdmin: boolean
  ): Promise<AdminUserSummary> {
    const users = this.inMemoryAuth.getUsersList();
    const targetUser = users.find((u) => u.id === targetUserId);

    if (!targetUser) {
      throw new NotFoundError("Usuário alvo não encontrado.");
    }

    if (
      targetUser.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() &&
      !isAdmin
    ) {
      throw new ForbiddenError(
        `Não é permitido revogar a permissão do administrador principal (${SUPERADMIN_EMAIL}).`
      );
    }

    this.inMemoryAuth.setUserAdmin(targetUserId, isAdmin);

    const all = await this.getUsers();
    return all.find((u) => u.id === targetUserId)!;
  }
}

// Instância padrão do serviço de administração
let defaultAdminServiceInstance: IAdminService;

function createDefaultAdminService(): IAdminService {
  if (env.DATABASE_URL) {
    const pool = getDbPool();
    if (pool) {
      return new PostgresAdminService(pool);
    }
  }

  const auth = getAuthService();
  if (auth instanceof InMemoryAuthService) {
    return new InMemoryAdminService(auth);
  }

  // Fallback
  return new InMemoryAdminService(new InMemoryAuthService());
}

export function getAdminService(): IAdminService {
  if (!defaultAdminServiceInstance) {
    defaultAdminServiceInstance = createDefaultAdminService();
  }
  return defaultAdminServiceInstance;
}

export function setAdminServiceForTesting(service: IAdminService): void {
  defaultAdminServiceInstance = service;
}
