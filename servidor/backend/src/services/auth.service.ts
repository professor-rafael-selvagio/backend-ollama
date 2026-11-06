import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { RegisterInput, LoginInput } from "../schemas/auth.schema";
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
}

/**
 * Serviço de autenticação conectado diretamente ao Supabase Auth
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

  public clear(): void {
    this.users.clear();
  }
}

// Inicializa a instância padrão de acordo com as variáveis de ambiente
let defaultAuthServiceInstance: IAuthService;

if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  defaultAuthServiceInstance = new SupabaseAuthService(supabase);
} else {
  logger.info(
    "Credenciais do Supabase não configuradas. Utilizando AuthService em memória para desenvolvimento local."
  );
  defaultAuthServiceInstance = new InMemoryAuthService();
}

export function setAuthServiceForTesting(service: IAuthService): void {
  defaultAuthServiceInstance = service;
}

export function getAuthService(): IAuthService {
  return defaultAuthServiceInstance;
}

