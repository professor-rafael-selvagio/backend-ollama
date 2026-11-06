/**
 * Classes padronizadas de erros da aplicação
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = "INTERNAL_SERVER_ERROR",
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dados de entrada inválidos", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação obrigatória ou token inválido") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado ao recurso ou modelo solicitado") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

export class TimeoutError extends AppError {
  constructor(message = "Tempo limite excedido ao comunicar com o serviço Ollama") {
    super(message, 504, "GATEWAY_TIMEOUT");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Serviço Ollama temporariamente indisponível") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

