import { Router } from "express";
import { HealthController } from "../controllers/health.controller";

export const healthRoutes = Router();

healthRoutes.get("/", HealthController.getHealth);

