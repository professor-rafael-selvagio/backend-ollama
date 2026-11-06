import { Request, Response } from "express";

/**
 * Controller de Verificação de Saúde do Backend
 */
export class HealthController {
  public static getHealth(_req: Request, res: Response): void {
    res.status(200).json({
      status: "ok",
      service: "ollama-backend",
    });
  }
}

