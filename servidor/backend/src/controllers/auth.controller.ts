import { NextFunction, Request, Response } from "express";
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updateProfileSchema,
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

      let userProfile = req.user;
      try {
        const profile = await this.getService().getProfile(req.user.id);
        userProfile = {
          ...req.user,
          email: profile.email || req.user.email,
          name: profile.name ?? req.user.name,
          user_type: profile.user_type ?? req.user.user_type,
          ra: profile.ra ?? req.user.ra,
          cpf: profile.cpf ?? req.user.cpf,
          nif: profile.nif ?? req.user.nif,
          is_admin: profile.is_admin ?? req.user.is_admin,
          last_seen_at: profile.last_seen_at ?? req.user.last_seen_at,
        };
      } catch {
        // Fallback para dados decodificados do token caso o banco não responda
      }

      res.status(200).json({
        status: "success",
        data: {
          user: userProfile,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/heartbeat
   * Sinaliza atividade do usuário para contagem de status online
   */
  public heartbeat = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("Usuário não autenticado.");
      }
      await this.getService().recordActivity(req.user.id);
      res.status(200).json({
        status: "success",
        message: "Heartbeat registrado.",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/auth/profile
   * Atualiza as informações do perfil (nome) do usuário autenticado
   */
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("Usuário não autenticado.");
      }
      const validatedInput = updateProfileSchema.parse(req.body);
      const updatedUser = await this.getService().updateProfile(
        req.user.id,
        validatedInput
      );

      res.status(200).json({
        status: "success",
        message: "Perfil atualizado com sucesso.",
        data: {
          user: updatedUser,
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

