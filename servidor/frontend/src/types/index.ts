export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
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
