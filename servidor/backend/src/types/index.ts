/**
 * Definições de tipos para o Backend Ollama
 */

export interface OllamaModelDetails {
  format?: string;
  family?: string;
  families?: string[];
  parameter_size?: string;
  quantization_level?: string;
}

export interface OllamaModel {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: OllamaModelDetails;
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

export interface OllamaGenerationOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
  seed?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  options?: OllamaGenerationOptions;
  stream?: boolean;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  options?: OllamaGenerationOptions;
  stream?: boolean;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  project_id?: string | null;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithConversations extends Project {
  conversations: Conversation[];
}

export interface DatabaseMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  tokens?: number;
  created_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: DatabaseMessage[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

