import { Router } from "express";
import { defaultProjectController } from "../controllers/project.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export const projectRoutes = Router();

// Todas as rotas de projetos exigem autenticação do usuário
projectRoutes.use(authMiddleware);

projectRoutes.post("/", defaultProjectController.create);
projectRoutes.get("/", defaultProjectController.list);
projectRoutes.get("/:id", defaultProjectController.getById);
projectRoutes.patch("/:id", defaultProjectController.update);
projectRoutes.delete("/:id", defaultProjectController.delete);

