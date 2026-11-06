import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
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

export interface IConversationRepository {
  createConversation(userId: string, model: string, title?: string): Promise<Conversation>;
  listConversations(userId: string): Promise<Conversation[]>;
  getConversation(userId: string, conversationId: string): Promise<Conversation | null>;
  getMessages(conversationId: string): Promise<DatabaseMessage[]>;
  addMessage(
    conversationId: string,
    userId: string,
    role: "system" | "user" | "assistant",
    content: string,
    tokens?: number
  ): Promise<DatabaseMessage>;
  updateTitle(userId: string, conversationId: string, title: string): Promise<Conversation>;
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
    title = "Nova Conversa"
  ): Promise<Conversation> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const conv: Conversation = {
      id,
      user_id: userId,
      title,
      model,
      created_at: now,
      updated_at: now,
    };
    this.conversations.set(id, conv);
    this.messages.set(id, []);
    return conv;
  }

  public async listConversations(userId: string): Promise<Conversation[]> {
    const list: Conversation[] = [];
    for (const conv of this.conversations.values()) {
      if (conv.user_id === userId) {
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
    if (!conv || conv.user_id !== userId) return null;
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
    tokens?: number
  ): Promise<DatabaseMessage> {
    const msg: DatabaseMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
      tokens,
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
    const conv = await this.getConversation(userId, conversationId);
    if (!conv) {
      throw new NotFoundError("Conversa não encontrada");
    }
    conv.title = title;
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
    this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
    return true;
  }

  public clear(): void {
    this.conversations.clear();
    this.messages.clear();
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
    title = "Nova Conversa"
  ): Promise<Conversation> {
    const { data, error } = await this.client
      .from("conversations")
      .insert({
        user_id: userId,
        model,
        title,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error("Erro ao criar conversa no Supabase", error as unknown as Error);
      throw new Error(`Falha ao criar conversa no banco de dados: ${error?.message}`);
    }

    return data as Conversation;
  }

  public async listConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await this.client
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

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
    tokens?: number
  ): Promise<DatabaseMessage> {
    const { data, error } = await this.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        tokens,
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
    const { data, error } = await this.client
      .from("conversations")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !data) {
      logger.error("Erro ao renomear conversa no Supabase", error as unknown as Error);
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
      input.title || "Nova Conversa"
    );
  }

  public async list(userId: string): Promise<Conversation[]> {
    return this.repository.listConversations(userId);
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

    // 4. Grava a resposta da IA no banco
    const assistantMessage = await this.repository.addMessage(
      conversationId,
      userId,
      "assistant",
      aiResponse.message.content,
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

