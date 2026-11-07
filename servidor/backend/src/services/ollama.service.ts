import { env } from "../config/env";
import {
  AppError,
  ForbiddenError,
  ServiceUnavailableError,
  TimeoutError,
} from "../utils/errors";
import { logger } from "../utils/logger";
import {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaModel,
  OllamaTagsResponse,
} from "../types";

export class OllamaService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly allowedModels: string[];
  private readonly keepAlive: string;

  constructor(
    baseUrl = env.OLLAMA_BASE_URL,
    timeoutMs = env.OLLAMA_TIMEOUT,
    allowedModels = env.ALLOWED_MODELS,
    keepAlive = env.OLLAMA_KEEP_ALIVE
  ) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
    this.allowedModels = allowedModels;
    this.keepAlive = keepAlive;
  }

  /**
   * Verifica se o modelo especificado está na lista de modelos autorizados.
   * Se ALLOWED_MODELS estiver vazia, todos os modelos são permitidos.
   */
  public isModelAllowed(modelName: string): boolean {
    if (!this.allowedModels || this.allowedModels.length === 0) {
      return true;
    }

    const cleanModel = modelName.trim().toLowerCase();
    const modelWithTag = cleanModel.includes(":") ? cleanModel : `${cleanModel}:latest`;
    const modelBase = cleanModel.split(":")[0];

    return this.allowedModels.some((allowed) => {
      const cleanAllowed = allowed.trim().toLowerCase();
      const allowedWithTag = cleanAllowed.includes(":") ? cleanAllowed : `${cleanAllowed}:latest`;
      const allowedBase = cleanAllowed.split(":")[0];

      // 1. Correspondência exata
      if (cleanAllowed === cleanModel) return true;

      // 2. Correspondência normalizada com tag :latest
      if (allowedWithTag === modelWithTag) return true;

      // 3. Se a whitelist especificou apenas o modelo base sem tag (ex: "llama3"),
      // permite qualquer variação/tag desse modelo (ex: "llama3:8b", "llama3:instruct")
      if (!cleanAllowed.includes(":") && allowedBase === modelBase) return true;

      return false;
    });
  }

  /**
   * Executa requisição HTTP segura ao Ollama com controle de timeout e tratamento de erros.
   */
  private async fetchOllama<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      logger.debug("Enviando requisição à API do Ollama", { endpoint, url });

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        logger.warn("Ollama retornou resposta com status de erro", {
          status: response.status,
          endpoint,
          errorText,
        });

        if (response.status === 404) {
          throw new AppError(
            `Recurso ou modelo não encontrado no Ollama: ${errorText || "404 Not Found"}`,
            404,
            "MODEL_OR_ENDPOINT_NOT_FOUND"
          );
        }

        throw new AppError(
          `Erro retornado pela API do Ollama (${response.status}): ${errorText || "Falha na execução"}`,
          response.status >= 500 ? 502 : response.status,
          "OLLAMA_API_ERROR"
        );
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      const err = error as Error;

      if (err.name === "AbortError") {
        logger.error("Timeout na comunicação com o Ollama", err, { endpoint, timeoutMs: this.timeoutMs });
        throw new TimeoutError();
      }

      logger.error("Falha de conexão com a API do Ollama", err, { endpoint, url });
      throw new ServiceUnavailableError(
        "Não foi possível conectar ao container do Ollama. Verifique se o serviço está ativo na rede Docker."
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Verifica a disponibilidade e conectividade do Ollama.
   */
  public async checkStatus(): Promise<{
    status: "ok" | "unavailable";
    available: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.fetchOllama<OllamaTagsResponse>("/api/tags");
      return {
        status: "ok",
        available: true,
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      return {
        status: "unavailable",
        available: false,
        latencyMs: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }

  /**
   * Consulta os modelos instalados no Ollama e filtra conforme política de segurança.
   */
  public async listModels(): Promise<OllamaModel[]> {
    const data = await this.fetchOllama<OllamaTagsResponse>("/api/tags");
    const models = data.models || [];

    if (!this.allowedModels || this.allowedModels.length === 0) {
      return models;
    }

    return models.filter((m) => this.isModelAllowed(m.name));
  }

  /**
   * Gera texto utilizando POST /api/generate do Ollama.
   */
  public async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    if (!this.isModelAllowed(request.model)) {
      throw new ForbiddenError(
        `O modelo '${request.model}' não está autorizado para uso neste ambiente.`
      );
    }

    return this.fetchOllama<OllamaGenerateResponse>("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        keep_alive: request.keep_alive !== undefined ? request.keep_alive : this.keepAlive,
        stream: false,
      }),
    });
  }

  /**
   * Conversação utilizando POST /api/chat do Ollama.
   */
  public async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    if (!this.isModelAllowed(request.model)) {
      throw new ForbiddenError(
        `O modelo '${request.model}' não está autorizado para uso neste ambiente.`
      );
    }

    return this.fetchOllama<OllamaChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        keep_alive: request.keep_alive !== undefined ? request.keep_alive : this.keepAlive,
        stream: false,
      }),
    });
  }
}

export const defaultOllamaService = new OllamaService();

