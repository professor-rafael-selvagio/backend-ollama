import { NextFunction, Request, Response } from "express";
import { defaultOllamaService, OllamaService } from "../services/ollama.service";
import {
  chatRequestSchema,
  generateRequestSchema,
} from "../schemas/ollama.schema";

export class OllamaController {
  private ollamaService: OllamaService;

  constructor(service: OllamaService = defaultOllamaService) {
    this.ollamaService = service;
  }

  /**
   * GET /api/ollama/status
   * Verifica a conectividade com o container do Ollama
   */
  public getStatus = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const statusData = await this.ollamaService.checkStatus();
      res.status(statusData.available ? 200 : 503).json(statusData);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/ollama/models
   * Lista modelos disponíveis (filtrados conforme política de segurança)
   */
  public getModels = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const models = await this.ollamaService.listModels();
      res.status(200).json({
        models,
        total: models.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/ollama/generate
   * Gera texto a partir de um prompt individual
   */
  public generate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedPayload = generateRequestSchema.parse(req.body);
      const result = await this.ollamaService.generate(validatedPayload);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/ollama/chat
   * Executa conversação multi-turnos com modelos
   */
  public chat = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedPayload = chatRequestSchema.parse(req.body);
      const result = await this.ollamaService.chat(validatedPayload);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const defaultOllamaController = new OllamaController();

