export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  is_admin?: boolean;
  last_seen_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
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

export interface OllamaModel {
  name: string;
  size?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  total_conversations: number;
  total_messages: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

export interface AdminMetrics {
  total_users: number;
  online_users: number;
  total_conversations: number;
  total_messages: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

