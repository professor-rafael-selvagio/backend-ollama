import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Trata erros de validação do Zod
  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    logger.warn("Validação de entrada rejeitada", {
      path: req.path,
      method: req.method,
      issues,
    });

    res.status(400).json({
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Dados de requisição inválidos",
      details: issues,
    });
    return;
  }

  // Trata erros operacionais conhecidos da aplicação
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`Erro operacional crítico: ${err.message}`, err, {
        path: req.path,
        method: req.method,
        code: err.errorCode,
      });
    } else {
      logger.warn(`Erro operacional: ${err.message}`, {
        path: req.path,
        method: req.method,
        code: err.errorCode,
      });
    }

    res.status(err.statusCode).json({
      status: "error",
      code: err.errorCode,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Trata erro de corpo JSON malformado do Express
  if ("type" in err && err.type === "entity.parse.failed") {
    res.status(400).json({
      status: "error",
      code: "INVALID_JSON_BODY",
      message: "O corpo da requisição contém um JSON inválido",
    });
    return;
  }

  // Erros inesperados / não tratados
  logger.error("Erro interno não tratado no servidor", err as Error, {
    path: req.path,
    method: req.method,
  });

  const isProduction = env.NODE_ENV === "production";

  res.status(500).json({
    status: "error",
    code: "INTERNAL_SERVER_ERROR",
    message: "Ocorreu um erro interno no servidor",
    ...(!isProduction && {
      stack: (err as Error).stack,
      rawError: (err as Error).message,
    }),
  });
};

