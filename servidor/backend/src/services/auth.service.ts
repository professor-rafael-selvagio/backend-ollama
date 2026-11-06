import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { getDbPool } from "../config/database";
import { RegisterInput, LoginInput, ChangePasswordInput } from "../schemas/auth.schema";
import { UnauthorizedError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AuthResult {
  user: AuthUser;
  session: AuthSession | null;
  message?: string;
}

export interface IAuthService {
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  refreshSession(refreshToken: string): Promise<AuthSession>;
  changePassword(userId: string, input: ChangePasswordInput): Promise<{ message: string }>;
}

/**
 * Serviço de autenticação conectado diretamente ao banco de dados PostgreSQL
 */
export class PostgresAuthService implements IAuthService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async register(input: RegisterInput): Promise<AuthResult> {
    const emailKey = input.email.toLowerCase();

    // Verifica se já existe usuário cadastrado
    const existing = await this.pool.query(
      "SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1",
      [emailKey]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      throw new ValidationError("Este e-mail já está cadastrado.");
    }

    // Hash da senha com bcrypt
    const passwordHash = await bcrypt.hash(input.password, 10);
    const metadata = input.name ? { name: input.name } : {};

    const insertResult = await this.pool.query(
      `INSERT INTO auth.users (email, password_hash, raw_user_meta_data)
       VALUES ($1, $2, $3)
       RETURNING id, email, created_at`,
      [emailKey, passwordHash, JSON.stringify(metadata)]
    );

    const user = insertResult.rows[0];

    // Geração de tokens JWT
    const access_token = jwt.sign(
      { sub: user.id, email: user.email, role: "authenticated", name: input.name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refresh_token = jwt.sign(
      { sub: user.id, type: "refresh" },
      env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: input.name,
        role: "authenticated",
      },
      session: {
        access_token,
        refresh_token,
        expires_in: 7 * 24 * 3600,
        token_type: "Bearer",
      },
      message: "Usuário registrado com sucesso.",
    };
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const emailKey = input.email.toLowerCase();

    const queryResult = await this.pool.query(
      "SELECT id, email, password_hash, raw_user_meta_data FROM auth.users WHERE lower(email) = lower($1) LIMIT 1",
      [emailKey]
    );

    if (!queryResult.rowCount || queryResult.rowCount === 0) {
      throw new UnauthorizedError("Credenciais de acesso inválidas.");
    }

    const user = queryResult.rows[0];

    if (!user.password_hash) {
      throw new UnauthorizedError("Credenciais de acesso inválidas.");
    }

    const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Credenciais de acesso inválidas.");
    }

    const name = user.raw_user_meta_data?.name;

    const access_token = jwt.sign(
      { sub: user.id, email: user.email, role: "authenticated", name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refresh_token = jwt.sign(
      { sub: user.id, type: "refresh" },
      env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name,
        role: "authenticated",
      },
      session: {
        access_token,
        refresh_token,
        expires_in: 7 * 24 * 3600,
        token_type: "Bearer",
      },
      message: "Login realizado com sucesso.",
    };
  }

  public async refreshSession(refreshToken: string): Promise<AuthSession> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as {
        sub: string;
        type?: string;
      };

      if (decoded.type !== "refresh") {
        throw new UnauthorizedError("Refresh token inválido ou expirado.");
      }

      const userRes = await this.pool.query(
        "SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1 LIMIT 1",
        [decoded.sub]
      );

      if (!userRes.rowCount || userRes.rowCount === 0) {
        throw new UnauthorizedError("Usuário não encontrado.");
      }

      const user = userRes.rows[0];
      const name = user.raw_user_meta_data?.name;

      const access_token = jwt.sign(
        { sub: user.id, email: user.email, role: "authenticated", name },
        env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const new_refresh_token = jwt.sign(
        { sub: user.id, type: "refresh" },
        env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      return {
        access_token,
        refresh_token: new_refresh_token,
        expires_in: 7 * 24 * 3600,
        token_type: "Bearer",
      };
    } catch {
      throw new UnauthorizedError("Refresh token inválido ou expirado.");
    }
  }

  public async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<{ message: string }> {
    const queryResult = await this.pool.query(
      "SELECT id, password_hash FROM auth.users WHERE id = $1 LIMIT 1",
      [userId]
    );

    if (!queryResult.rowCount || queryResult.rowCount === 0) {
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    const user = queryResult.rows[0];
    if (!user.password_hash) {
      throw new UnauthorizedError("Credenciais de acesso inválidas.");
    }

    const isValid = await bcrypt.compare(input.currentPassword, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError("A senha atual informada está incorreta.");
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await this.pool.query(
      "UPDATE auth.users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [newHash, userId]
    );

    return { message: "Senha alterada com sucesso." };
  }
}

/**
 * Serviço de autenticação conectado ao Supabase Auth (caso use Supabase em nuvem)
 */
export class SupabaseAuthService implements IAuthService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  public async register(input: RegisterInput): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: input.name ? { name: input.name } : undefined,
      },
    });

    if (error) {
      logger.warn("Falha no cadastro via Supabase Auth", {
        error: error.message,
        email: input.email,
      });
      throw new ValidationError(error.message);
    }

    if (!data.user) {
      throw new ValidationError("Falha ao registrar usuário.");
    }

    const session = data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type || "Bearer",
        }
      : null;

    return {
      user: {
        id: data.user.id,
        email: data.user.email || input.email,
        name: input.name,
        role: data.user.role || "authenticated",
      },
      session,
      message: session
        ? "Usuário registrado com sucesso."
        : "Usuário registrado com sucesso. Por favor, confirme seu e-mail para ativar a conta.",
    };
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user || !data.session) {
      logger.warn("Tentativa de login inválida", {
        error: error?.message,
        email: input.email,
      });
      throw new UnauthorizedError(error?.message || "Credenciais de acesso inválidas.");
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || input.email,
        role: data.user.role || "authenticated",
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type || "Bearer",
      },
      message: "Login realizado com sucesso.",
    };
  }

  public async refreshSession(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      logger.warn("Falha ao renovar sessão", { error: error?.message });
      throw new UnauthorizedError("Refresh token inválido ou expirado.");
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type || "Bearer",
    };
  }

  public async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<{ message: string }> {
    const { error } = await this.client.auth.updateUser({
      password: input.newPassword,
    });
    if (error) {
      throw new UnauthorizedError(error.message);
    }
    return { message: "Senha alterada com sucesso." };
  }
}

/**
 * Serviço de autenticação em memória para testes e desenvolvimento offline
 */
export class InMemoryAuthService implements IAuthService {
  private users: Map<
    string,
    { id: string; email: string; passwordHash: string; name?: string }
  > = new Map();

  public async register(input: RegisterInput): Promise<AuthResult> {
    const emailKey = input.email.toLowerCase();
    if (this.users.has(emailKey)) {
      throw new ValidationError("Este e-mail já está cadastrado.");
    }

    const id = crypto.randomUUID();
    const passwordHash = crypto
      .createHash("sha256")
      .update(input.password)
      .digest("hex");

    this.users.set(emailKey, {
      id,
      email: emailKey,
      passwordHash,
      name: input.name,
    });

    return {
      user: {
        id,
        email: emailKey,
        name: input.name,
        role: "authenticated",
      },
      session: {
        access_token: `mock-jwt-${id}`,
        refresh_token: `mock-refresh-${id}`,
        expires_in: 3600,
        token_type: "Bearer",
      },
      message: "Usuário registrado com sucesso (modo local).",
    };
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const emailKey = input.email.toLowerCase();
    const user = this.users.get(emailKey);
    const hash = crypto
      .createHash("sha256")
      .update(input.password)
      .digest("hex");

    if (!user || user.passwordHash !== hash) {
      throw new UnauthorizedError("Credenciais de acesso inválidas.");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "authenticated",
      },
      session: {
        access_token: `mock-jwt-${user.id}`,
        refresh_token: `mock-refresh-${user.id}`,
        expires_in: 3600,
        token_type: "Bearer",
      },
      message: "Login realizado com sucesso (modo local).",
    };
  }

  public async refreshSession(refreshToken: string): Promise<AuthSession> {
    if (!refreshToken || !refreshToken.startsWith("mock-refresh-")) {
      throw new UnauthorizedError("Refresh token inválido ou expirado.");
    }

    const id = refreshToken.replace("mock-refresh-", "");
    return {
      access_token: `mock-jwt-${id}`,
      refresh_token: `mock-refresh-${id}`,
      expires_in: 3600,
      token_type: "Bearer",
    };
  }

  public async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<{ message: string }> {
    let foundUser: { id: string; email: string; passwordHash: string; name?: string } | null = null;
    for (const u of this.users.values()) {
      if (u.id === userId) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    const currentHash = crypto
      .createHash("sha256")
      .update(input.currentPassword)
      .digest("hex");

    if (foundUser.passwordHash !== currentHash) {
      throw new UnauthorizedError("A senha atual informada está incorreta.");
    }

    foundUser.passwordHash = crypto
      .createHash("sha256")
      .update(input.newPassword)
      .digest("hex");

    return { message: "Senha alterada com sucesso." };
  }

  public clear(): void {
    this.users.clear();
  }
}

// Inicializa a instância padrão de acordo com as variáveis de ambiente
let defaultAuthServiceInstance: IAuthService;

if (env.DATABASE_URL) {
  const pool = getDbPool();
  if (pool) {
    defaultAuthServiceInstance = new PostgresAuthService(pool);
  } else {
    defaultAuthServiceInstance = new InMemoryAuthService();
  }
} else if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  defaultAuthServiceInstance = new SupabaseAuthService(supabase);
} else {
  logger.info(
    "Credenciais do Supabase/PostgreSQL não configuradas. Utilizando AuthService em memória para desenvolvimento local."
  );
  defaultAuthServiceInstance = new InMemoryAuthService();
}

export function setAuthServiceForTesting(service: IAuthService): void {
  defaultAuthServiceInstance = service;
}

export function getAuthService(): IAuthService {
  return defaultAuthServiceInstance;
}
