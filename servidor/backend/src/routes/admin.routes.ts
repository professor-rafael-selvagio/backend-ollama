import { Router } from "express";
import { defaultAdminController } from "../controllers/admin.controller";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";

export const adminRoutes = Router();

// Todas as rotas de administração exigem autenticação válida E perfil de administrador
adminRoutes.use(authMiddleware, adminMiddleware);

// Métricas consolidadas do sistema e tokens
adminRoutes.get("/metrics", defaultAdminController.getMetrics);

// Listagem de usuários com status online e consumo de tokens
adminRoutes.get("/users", defaultAdminController.getUsers);

// Alteração de permissão administrativa de um usuário
adminRoutes.patch("/users/:id/role", defaultAdminController.updateUserRole);

// Aba exclusiva da Lixeira: Itens excluídos logicamente
adminRoutes.get("/deleted", defaultAdminController.getDeleted);

// Restauração de item excluído logicamente
adminRoutes.post("/restore", defaultAdminController.restoreItem);

// Histórico de auditoria do sistema
adminRoutes.get("/audit-logs", defaultAdminController.getAuditLogs);
