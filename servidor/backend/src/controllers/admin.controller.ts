import { NextFunction, Request, Response } from "express";
import { updateUserRoleSchema } from "../schemas/admin.schema";
import { getAdminService, IAdminService } from "../services/admin.service";
import { UnauthorizedError } from "../utils/errors";

export class AdminController {
  private getService(): IAdminService {
    return getAdminService();
  }

  /**
   * GET /api/admin/metrics
   * Retorna métricas globais de usuários, status online e consumo de tokens
   */
  public getMetrics = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const metrics = await this.getService().getMetrics();
      res.status(200).json({
        status: "success",
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/users
   * Lista todos os usuários cadastrados com métricas individuais e status online
   */
  public getUsers = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const users = await this.getService().getUsers();
      res.status(200).json({
        status: "success",
        data: {
          users,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/users/:id/role
   * Concede ou revoga permissão de administrador para o usuário especificado
   */
  public updateUserRole = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("Usuário não autenticado.");
      }

      const targetUserId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : String(req.params.id);
      const validated = updateUserRoleSchema.parse(req.body);

      const updatedUser = await this.getService().updateUserRole(
        req.user.id,
        targetUserId,
        validated.is_admin
      );

      res.status(200).json({
        status: "success",
        message: validated.is_admin
          ? "Permissão de administrador concedida com sucesso."
          : "Permissão de administrador revogada com sucesso.",
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const defaultAdminController = new AdminController();
