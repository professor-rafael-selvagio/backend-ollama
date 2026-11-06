import { NextFunction, Request, Response } from "express";
import {
  ConversationService,
  defaultConversationService,
} from "../services/conversation.service";
import {
  conversationIdParamSchema,
  createConversationSchema,
  sendMessageSchema,
  updateConversationSchema,
} from "../schemas/conversation.schema";
import { UnauthorizedError } from "../utils/errors";

export class ConversationController {
  private service: ConversationService;

  constructor(service: ConversationService = defaultConversationService) {
    this.service = service;
  }

  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Usuário não identificado na sessão.");
    }
    return userId;
  }

  /**
   * POST /api/conversations
   * Cria nova conversa para o usuário logado
   */
  public create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const validatedPayload = createConversationSchema.parse(req.body);
      const conversation = await this.service.create(userId, validatedPayload);
      res.status(201).json(conversation);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/conversations
   * Lista todas as conversas do usuário logado (opcionalmente filtradas por projeto)
   */
  public list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const projectIdQuery = req.query.projectId;
      let projectId: string | null | undefined = undefined;

      if (projectIdQuery !== undefined) {
        projectId = projectIdQuery === "null" || projectIdQuery === "" ? null : String(projectIdQuery);
      }

      const conversations = await this.service.list(userId, projectId);
      res.status(200).json({
        conversations,
        total: conversations.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/conversations/:id
   * Obtém a conversa com todo o histórico de mensagens
   */
  public getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { id } = conversationIdParamSchema.parse(req.params);
      const data = await this.service.getWithMessages(userId, id);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/conversations/:id
   * Atualiza a conversa (título e/ou projeto)
   */
  public rename = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { id } = conversationIdParamSchema.parse(req.params);
      const payload = updateConversationSchema.parse(req.body);
      const updated = await this.service.update(userId, id, payload);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/conversations/:id
   * Remove a conversa e suas mensagens
   */
  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { id } = conversationIdParamSchema.parse(req.params);
      const result = await this.service.delete(userId, id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/conversations/:id/messages
   * Envia mensagem para o chat, consulta o Ollama e persiste pergunta e resposta
   */
  public sendMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { id } = conversationIdParamSchema.parse(req.params);
      const validatedPayload = sendMessageSchema.parse(req.body);

      const result = await this.service.sendMessage(userId, id, validatedPayload);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const defaultConversationController = new ConversationController();

