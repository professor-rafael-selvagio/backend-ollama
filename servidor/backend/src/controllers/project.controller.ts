import { NextFunction, Request, Response } from "express";
import {
  createProjectSchema,
  projectIdParamSchema,
  updateProjectSchema,
} from "../schemas/project.schema";
import {
  defaultProjectService,
  ProjectService,
} from "../services/project.service";
import { defaultConversationService } from "../services/conversation.service";
import { UnauthorizedError } from "../utils/errors";

export class ProjectController {
  private service: ProjectService;

  constructor(service: ProjectService = defaultProjectService) {
    this.service = service;
  }

  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Usuário não identificado na sessão.");
    }
    return userId;
  }

  public create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const validatedPayload = createProjectSchema.parse(req.body);
      const project = await this.service.create(userId, validatedPayload);
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  };

  public list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const projects = await this.service.list(userId);
      res.status(200).json({
        projects,
        total: projects.length,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { id } = projectIdParamSchema.parse(req.params);
      const projectWithChats = await this.service.getWithConversations(
        userId,
        id,
        defaultConversationService.getRepository()
      );
      res.status(200).json(projectWithChats);
    } catch (error) {
      next(error);
    }
  };

  public update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { id } = projectIdParamSchema.parse(req.params);
      const validatedPayload = updateProjectSchema.parse(req.body);
      const updated = await this.service.update(userId, id, validatedPayload);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  };

  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { id } = projectIdParamSchema.parse(req.params);
      await this.service.delete(userId, id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}

export const defaultProjectController = new ProjectController();
