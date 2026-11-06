import {
  Conversation,
  ConversationWithMessages,
  DatabaseMessage,
  OllamaModel,
  Project,
  Session,
  User,
} from "../types";

const TOKEN_KEY = "ollama_platform_token";
const USER_KEY = "ollama_platform_user";

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public setSession(session: Session, user: User): void {
    localStorage.setItem(TOKEN_KEY, session.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  public clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  public getSavedUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearSession();
      window.dispatchEvent(new Event("auth-expired"));
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Erro ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // --- Módulo Auth ---
  public auth = {
    register: async (email: string, password: string, name?: string) => {
      const res = await this.request<{
        status: string;
        data: { user: User; session: Session | null };
      }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      if (res.data.session) {
        this.setSession(res.data.session, res.data.user);
      }
      return res.data;
    },

    login: async (email: string, password: string) => {
      const res = await this.request<{
        status: string;
        data: { user: User; session: Session };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      this.setSession(res.data.session, res.data.user);
      return res.data;
    },

    me: async () => {
      const res = await this.request<{ status: string; data: { user: User } }>(
        "/api/auth/me"
      );
      return res.data.user;
    },
  };

  // --- Módulo Ollama ---
  public ollama = {
    getModels: async (): Promise<OllamaModel[]> => {
      const res = await this.request<{ models: OllamaModel[] }>("/api/ollama/models");
      return res.models || [];
    },
    getStatus: async () => {
      return this.request<{ status: string; available: boolean; latencyMs?: number }>(
        "/api/ollama/status"
      );
    },
  };

  // --- Módulo Projetos ---
  public projects = {
    list: async (): Promise<Project[]> => {
      const res = await this.request<{ projects: Project[] }>("/api/projects");
      return res.projects || [];
    },
    create: async (name: string, description?: string, color?: string): Promise<Project> => {
      return this.request<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, description, color }),
      });
    },
    update: async (
      id: string,
      data: { name?: string; description?: string; color?: string }
    ): Promise<Project> => {
      return this.request<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<void> => {
      await this.request<{ success: boolean }>(`/api/projects/${id}`, {
        method: "DELETE",
      });
    },
  };

  // --- Módulo Conversas ---
  public conversations = {
    list: async (projectId?: string | null): Promise<Conversation[]> => {
      const query =
        projectId !== undefined
          ? `?projectId=${projectId === null ? "null" : projectId}`
          : "";
      const res = await this.request<{ conversations: Conversation[] }>(
        `/api/conversations${query}`
      );
      return res.conversations || [];
    },
    getById: async (id: string): Promise<ConversationWithMessages> => {
      return this.request<ConversationWithMessages>(`/api/conversations/${id}`);
    },
    create: async (data: {
      model: string;
      title?: string;
      project_id?: string | null;
    }): Promise<Conversation> => {
      return this.request<Conversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (
      id: string,
      data: { title?: string; project_id?: string | null }
    ): Promise<Conversation> => {
      return this.request<Conversation>(`/api/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<void> => {
      await this.request<{ success: boolean }>(`/api/conversations/${id}`, {
        method: "DELETE",
      });
    },
    sendMessage: async (
      id: string,
      content: string,
      model?: string
    ): Promise<{ userMessage: DatabaseMessage; assistantMessage: DatabaseMessage }> => {
      return this.request<{
        userMessage: DatabaseMessage;
        assistantMessage: DatabaseMessage;
      }>(`/api/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, model }),
      });
    },
  };
}

export const api = new ApiService();

