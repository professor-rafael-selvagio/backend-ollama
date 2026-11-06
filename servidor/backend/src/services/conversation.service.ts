import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { env } from "../config/env";
import { getDbPool } from "../config/database";
import {
  Conversation,
  ConversationWithMessages,
  DatabaseMessage,
  OllamaChatMessage,
} from "../types";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import { defaultOllamaService, OllamaService } from "./ollama.service";
import {
  CreateConversationInput,
  SendMessageInput,
} from "../schemas/conversation.schema";
import { logger } from "../utils/logger";
import { getAuditService } from "./audit.service";

export interface IConversationRepository {
  createConversation(
    userId: string,
    model: string,
    title?: string,
    projectId?: string | null
  ): Promise<Conversation>;
  listConversations(userId: string, projectId?: string | null): Promise<Conversation[]>;
  getConversation(userId: string, conversationId: string): Promise<Conversation | null>;
  getMessages(conversationId: string): Promise<DatabaseMessage[]>;
  addMessage(
    conversationId: string,
    userId: string,
    role: "system" | "user" | "assistant",
    content: string,
    tokens?: number,
    promptTokens?: number,
    completionTokens?: number
  ): Promise<DatabaseMessage>;
  updateTitle(userId: string, conversationId: string, title: string): Promise<Conversation>;
  updateConversation(
    userId: string,
    conversationId: string,
    input: { title?: string; project_id?: string | null }
  ): Promise<Conversation>;
  deleteConversation(userId: string, conversationId: string): Promise<boolean>;
}

/**
 * Repositório em memória para desenvolvimento local offline e execução de testes automatizados
 */
export class InMemoryConversationRepository implements IConversationRepository {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, DatabaseMessage[]> = new Map();

  public async createConversation(
    userId: string,
    model: string,
    title = "Nova Conversa",
    projectId?: string | null
  ): Promise<Conversation> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const conv: Conversation = {
      id,
      user_id: userId,
      project_id: projectId || null,
      title,
      model,
      created_at: now,
      updated_at: now,
    };
    this.conversations.set(id, conv);
    this.messages.set(id, []);
    return conv;
  }

  public async listConversations(
    userId: string,
    projectId?: string | null
  ): Promise<Conversation[]> {
    const list: Conversation[] = [];
    for (const conv of this.conversations.values()) {
      if (conv.user_id === userId && !conv.deleted_at) {
        if (projectId !== undefined) {
          if (projectId === null && conv.project_id) continue;
          if (projectId !== null && conv.project_id !== projectId) continue;
        }
        list.push(conv);
      }
    }
    return list.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  public async getConversation(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.user_id !== userId || conv.deleted_at) return null;
    return conv;
  }

  public async getMessages(conversationId: string): Promise<DatabaseMessage[]> {
    const msgs = this.messages.get(conversationId) || [];
    return [...msgs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  public async addMessage(
    conversationId: string,
    userId: string,
    role: "system" | "user" | "assistant",
    content: string,
    tokens?: number,
    promptTokens?: number,
    completionTokens?: number
  ): Promise<DatabaseMessage> {
    const msg: DatabaseMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
      tokens,
      prompt_tokens: promptTokens ?? (role === "user" ? tokens ?? 0 : 0),
      completion_tokens: completionTokens ?? (role === "assistant" ? tokens ?? 0 : 0),
      created_at: new Date().toISOString(),
    };
    const list = this.messages.get(conversationId) || [];
    list.push(msg);
    this.messages.set(conversationId, list);

    // Atualiza timestamp da conversa
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.updated_at = new Date().toISOString();
      this.conversations.set(conversationId, conv);
    }

    return msg;
  }

  public async updateTitle(
    userId: string,
    conversationId: string,
    title: string
  ): Promise<Conversation> {
    return this.updateConversation(userId, conversationId, { title });
  }

  public async updateConversation(
    userId: string,
    conversationId: string,
    input: { title?: string; project_id?: string | null }
  ): Promise<Conversation> {
    const conv = await this.getConversation(userId, conversationId);
    if (!conv) {
      throw new NotFoundError("Conversa não encontrada");
    }
    if (input.title !== undefined) conv.title = input.title;
    if (input.project_id !== undefined) conv.project_id = input.project_id;
    conv.updated_at = new Date().toISOString();
    this.conversations.set(conversationId, conv);
    return conv;
  }

  public async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const conv = await this.getConversation(userId, conversationId);
    if (!conv) return false;
    conv.deleted_at = new Date().toISOString();
    this.conversations.set(conversationId, conv);

    getAuditService()
      .log({
        userId,
        action: "CONVERSATION_DELETE",
        resourceType: "conversation",
        resourceId: conversationId,
        details: { title: conv.title },
      })
      .catch(() => {});

    return true;
  }

  public getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  public restoreConversation(conversationId: string): boolean {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.deleted_at) return false;
    conv.deleted_at = undefined;
    this.conversations.set(conversationId, conv);
    return true;
  }

  public clear(): void {
    this.conversations.clear();
    this.messages.clear();
  }
}

/**
 * Repositório conectado diretamente ao banco de dados PostgreSQL
 */
export class PostgresConversationRepository implements IConversationRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async createConversation(
    userId: string,
    model: string,
    title = "Nova Conversa",
    projectId?: string | null
  ): Promise<Conversation> {
    const res = await this.pool.query(
      `INSERT INTO public.conversations (user_id, model, title, project_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, model, title, projectId || null]
    );
    return res.rows[0] as Conversation;
  }

  public async listConversations(
    userId: string,
    projectId?: string | null
  ): Promise<Conversation[]> {
    if (projectId === undefined) {
      const res = await this.pool.query(
        `SELECT * FROM public.conversations
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY updated_at DESC`,
        [userId]
      );
      return res.rows as Conversation[];
    } else if (projectId === null) {
      const res = await this.pool.query(
        `SELECT * FROM public.conversations
         WHERE user_id = $1 AND project_id IS NULL AND deleted_at IS NULL
         ORDER BY updated_at DESC`,
        [userId]
      );
      return res.rows as Conversation[];
    } else {
      const res = await this.pool.query(
        `SELECT * FROM public.conversations
         WHERE user_id = $1 AND project_id = $2 AND deleted_at IS NULL
         ORDER BY updated_at DESC`,
        [userId, projectId]
      );
      return res.rows as Conversation[];
    }
  }

  public async getConversation(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    const res = await this.pool.query(
      `SELECT * FROM public.conversations
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [conversationId, userId]
    );
    if (!res.rowCount || res.rowCount === 0) return null;
    return res.rows[0] as Conversation;
  }

  public async getMessages(conversationId: string): Promise<DatabaseMessage[]> {
    const res = await this.pool.query(
      `SELECT * FROM public.messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return res.rows as DatabaseMessage[];
  }

  public async addMessage(
    conversationId: string,
    userId: string,
    role: "system" | "user" | "assistant",
    content: string,
    tokens?: number,
    promptTokens?: number,
    completionTokens?: number
  ): Promise<DatabaseMessage> {
    const res = await this.pool.query(
      `INSERT INTO public.messages (conversation_id, user_id, role, content, tokens, prompt_tokens, completion_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        conversationId,
        userId,
        role,
        content,
        tokens ?? null,
        promptTokens ?? (role === "user" ? tokens ?? 0 : 0),
        completionTokens ?? (role === "assistant" ? tokens ?? 0 : 0),
      ]
    );

    await this.pool.query(
      `UPDATE public.conversations
       SET updated_at = now()
       WHERE id = $1`,
      [conversationId]
    );

    return res.rows[0] as DatabaseMessage;
  }

  public async updateTitle(
    userId: string,
    conversationId: string,
    title: string
  ): Promise<Conversation> {
    return this.updateConversation(userId, conversationId, { title });
  }

  public async updateConversation(
    userId: string,
    conversationId: string,
    input: { title?: string; project_id?: string | null }
  ): Promise<Conversation> {
    const fields: string[] = [];
    const values: unknown[] = [conversationId, userId];
    let idx = 3;

    if (input.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(input.title);
    }
    if (input.project_id !== undefined) {
      fields.push(`project_id = $${idx++}`);
      values.push(input.project_id);
    }

    if (fields.length === 0) {
      const existing = await this.getConversation(userId, conversationId);
      if (!existing) throw new NotFoundError("Conversa não encontrada");
      return existing;
    }

    fields.push("updated_at = now()");

    const query = `
      UPDATE public.conversations
      SET ${fields.join(", ")}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const res = await this.pool.query(query, values);

    if (!res.rowCount || res.rowCount === 0) {
      throw new NotFoundError("Conversa não encontrada para atualização");
    }

    return res.rows[0] as Conversation;
  }

  public async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE public.conversations
       SET deleted_at = now()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [conversationId, userId]
    );

    const deleted = (res.rowCount ?? 0) > 0;
    if (deleted) {
      getAuditService()
        .log({
          userId,
          action: "CONVERSATION_DELETE",
          resourceType: "conversation",
          resourceId: conversationId,
        })
        .catch(() => {});
    }

    return deleted;
  }
}

/**
 * Repositório conectado ao banco de dados PostgreSQL do Supabase
 */
export class SupabaseConversationRepository implements IConversationRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  public async createConversation(
    userId: string,
    model: string,
    title = "Nova Conversa",
    projectId?: string | null
  ): Promise<Conversation> {
    const { data, error } = await this.client
      .from("conversations")
      .insert({
        user_id: userId,
        model,
        title,
        project_id: projectId || null,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error("Erro ao criar conversa no Supabase", error as unknown as Error);
      throw new Error(`Falha ao criar conversa no banco de dados: ${error?.message}`);
    }

    return data as Conversation;
  }

  public async listConversations(
    userId: string,
    projectId?: string | null
  ): Promise<Conversation[]> {
    let query = this.client
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (projectId !== undefined) {
      if (projectId === null) {
        query = query.is("project_id", null);
      } else {
        query = query.eq("project_id", projectId);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Erro ao listar conversas no Supabase", error as unknown as Error);
      throw new Error(`Falha ao buscar conversas: ${error.message}`);
    }

    return (data || []) as Conversation[];
  }

  public async getConversation(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logger.error("Erro ao buscar conversa no Supabase", error as unknown as Error);
      throw new Error(`Falha ao obter conversa: ${error.message}`);
    }

    return data as Conversation | null;
  }

  public async getMessages(conversationId: string): Promise<DatabaseMessage[]> {
    const { data, error } = await this.client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Erro ao buscar mensagens no Supabase", error as unknown as Error);
      throw new Error(`Falha ao obter histórico de mensagens: ${error.message}`);
    }

    return (data || []) as DatabaseMessage[];
  }

  public async addMessage(
    conversationId: string,
    userId: string,
    role: "system" | "user" | "assistant",
    content: string,
    tokens?: number,
    promptTokens?: number,
    completionTokens?: number
  ): Promise<DatabaseMessage> {
    const { data, error } = await this.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        tokens,
        prompt_tokens: promptTokens ?? 0,
        completion_tokens: completionTokens ?? 0,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error("Erro ao inserir mensagem no Supabase", error as unknown as Error);
      throw new Error(`Falha ao registrar mensagem no banco: ${error?.message}`);
    }

    // Atualiza o updated_at da conversa
    await this.client
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return data as DatabaseMessage;
  }

  public async updateTitle(
    userId: string,
    conversationId: string,
    title: string
  ): Promise<Conversation> {
    return this.updateConversation(userId, conversationId, { title });
  }

  public async updateConversation(
    userId: string,
    conversationId: string,
    input: { title?: string; project_id?: string | null }
  ): Promise<Conversation> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.project_id !== undefined) updatePayload.project_id = input.project_id;

    const { data, error } = await this.client
      .from("conversations")
      .update(updatePayload)
      .eq("id", conversationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !data) {
      logger.error("Erro ao atualizar conversa no Supabase", error as unknown as Error);
      throw new NotFoundError("Conversa não encontrada para atualização");
    }

    return data as Conversation;
  }

  public async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const { error } = await this.client
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);

    if (error) {
      logger.error("Erro ao deletar conversa no Supabase", error as unknown as Error);
      return false;
    }

    return true;
  }
}

/**
 * Serviço de Gerenciamento e Persistência de Conversas
 */
export class ConversationService {
  private repository: IConversationRepository;
  private ollamaService: OllamaService;

  constructor(
    repository?: IConversationRepository,
    ollamaService: OllamaService = defaultOllamaService
  ) {
    if (repository) {
      this.repository = repository;
    } else if (env.DATABASE_URL) {
      const pool = getDbPool();
      if (pool) {
        this.repository = new PostgresConversationRepository(pool);
      } else {
        this.repository = new InMemoryConversationRepository();
      }
    } else if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
      this.repository = new SupabaseConversationRepository(supabase);
    } else {
      // Fallback padrão para desenvolvimento local e testes sem Supabase
      this.repository = new InMemoryConversationRepository();
    }

    this.ollamaService = ollamaService;
  }

  public setRepositoryForTesting(repo: IConversationRepository): void {
    this.repository = repo;
  }

  public getRepository(): IConversationRepository {
    return this.repository;
  }

  public async create(
    userId: string,
    input: CreateConversationInput
  ): Promise<Conversation> {
    if (!this.ollamaService.isModelAllowed(input.model)) {
      throw new ForbiddenError(
        `O modelo '${input.model}' não está autorizado para novas conversas.`
      );
    }

    return this.repository.createConversation(
      userId,
      input.model,
      input.title || "Nova Conversa",
      input.project_id || null
    );
  }

  public async list(
    userId: string,
    projectId?: string | null
  ): Promise<Conversation[]> {
    return this.repository.listConversations(userId, projectId);
  }

  public async update(
    userId: string,
    conversationId: string,
    input: { title?: string; project_id?: string | null }
  ): Promise<Conversation> {
    return this.repository.updateConversation(userId, conversationId, input);
  }

  public async getWithMessages(
    userId: string,
    conversationId: string
  ): Promise<ConversationWithMessages> {
    const conversation = await this.repository.getConversation(userId, conversationId);
    if (!conversation) {
      throw new NotFoundError("Conversa não encontrada");
    }

    const messages = await this.repository.getMessages(conversationId);
    return {
      ...conversation,
      messages,
    };
  }

  public async rename(
    userId: string,
    conversationId: string,
    newTitle: string
  ): Promise<Conversation> {
    return this.repository.updateTitle(userId, conversationId, newTitle);
  }

  public async delete(
    userId: string,
    conversationId: string
  ): Promise<{ success: boolean }> {
    const deleted = await this.repository.deleteConversation(userId, conversationId);
    if (!deleted) {
      throw new NotFoundError("Conversa não encontrada para exclusão");
    }
    return { success: true };
  }

  public async sendMessage(
    userId: string,
    conversationId: string,
    input: SendMessageInput
  ): Promise<{
    userMessage: DatabaseMessage;
    assistantMessage: DatabaseMessage;
  }> {
    const conversation = await this.repository.getConversation(userId, conversationId);
    if (!conversation) {
      throw new NotFoundError("Conversa não encontrada");
    }

    // 1. Grava a mensagem enviada pelo usuário no banco
    const userMessage = await this.repository.addMessage(
      conversationId,
      userId,
      "user",
      input.content
    );

    // 2. Monta o histórico recente para passar de contexto à LLM
    const existingMessages = await this.repository.getMessages(conversationId);
    const contextMessages: OllamaChatMessage[] = existingMessages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. Consulta a IA através do serviço Ollama
    const aiResponse = await this.ollamaService.chat({
      model: conversation.model,
      messages: contextMessages,
      options: input.options,
      stream: false,
    });

    // 4. Grava a resposta da IA no banco com contagem de tokens de entrada e saída
    const assistantMessage = await this.repository.addMessage(
      conversationId,
      userId,
      "assistant",
      aiResponse.message.content,
      aiResponse.eval_count,
      aiResponse.prompt_eval_count,
      aiResponse.eval_count
    );

    // 5. Se for a primeira mensagem e o título ainda for o padrão, atualiza o título automaticamente
    if (conversation.title === "Nova Conversa" && existingMessages.length <= 2) {
      const generatedTitle = input.content.slice(0, 40).trim() + (input.content.length > 40 ? "..." : "");
      await this.repository.updateTitle(userId, conversationId, generatedTitle).catch(() => {});
    }

    return {
      userMessage,
      assistantMessage,
    };
  }
}

export const defaultConversationService = new ConversationService();

