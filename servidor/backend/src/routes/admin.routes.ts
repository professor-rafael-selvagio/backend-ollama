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

// Bloqueio ou desbloqueio de acesso de um usuário
adminRoutes.patch("/users/:id/block", defaultAdminController.blockUser);

// Aba exclusiva da Lixeira: Itens excluídos logicamente
adminRoutes.get("/deleted", defaultAdminController.getDeleted);

// Restauração de item excluído logicamente
adminRoutes.post("/restore", defaultAdminController.restoreItem);

// Histórico de auditoria do sistema
adminRoutes.get("/audit-logs", defaultAdminController.getAuditLogs);

// Monitoramento de recursos do servidor (CPU, memória, disco, uptime)
adminRoutes.get("/system-resources", defaultAdminController.getSystemResources);

// Histórico de medições de recursos gravadas a cada 5 minutos
adminRoutes.get("/system-resources/history", defaultAdminController.getSystemResourcesHistory);

// Análise detalhada de consumo de tokens (entrada vs saída e pico)
adminRoutes.get("/tokens/analytics", defaultAdminController.getTokenAnalytics);
