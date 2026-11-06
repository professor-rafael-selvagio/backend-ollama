import { NextFunction, Request, Response } from "express";
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "../schemas/auth.schema";
import { getAuthService, IAuthService } from "../services/auth.service";
import { UnauthorizedError } from "../utils/errors";

export class AuthController {
  private getService(): IAuthService {
    return getAuthService();
  }

  /**
   * POST /api/auth/register
   * Cadastra um novo usuário
   */
  public register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = registerSchema.parse(req.body);
      const result = await this.getService().register(validatedInput);

      res.status(201).json({
        status: "success",
        message: result.message,
        data: {
          user: result.user,
          session: result.session,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/login
   * Autentica usuário com email e senha
   */
  public login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const result = await this.getService().login(validatedInput);

      res.status(200).json({
        status: "success",
        message: result.message,
        data: {
          user: result.user,
          session: result.session,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/refresh
   * Renova o token de acesso utilizando um refresh_token válido
   */
  public refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = refreshTokenSchema.parse(req.body);
      const session = await this.getService().refreshSession(
        validatedInput.refresh_token
      );

      res.status(200).json({
        status: "success",
        message: "Sessão renovada com sucesso.",
        data: {
          session,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/auth/me
   * Retorna os dados do usuário autenticado a partir do token
   */
  public me = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Usuário não autenticado.");
      }

      res.status(200).json({
        status: "success",
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/change-password
   * Altera a senha do usuário autenticado
   */
  public changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("Usuário não autenticado.");
      }
      const validatedInput = changePasswordSchema.parse(req.body);
      const result = await this.getService().changePassword(
        req.user.id,
        validatedInput
      );

      res.status(200).json({
        status: "success",
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const defaultAuthController = new AuthController();

