import { z } from "zod";

/**
 * Schema de validação para alteração de papel de administrador
 */
export const updateUserRoleSchema = z.object({
  is_admin: z.boolean({
    required_error: "A permissão de administrador (is_admin) é obrigatória.",
    invalid_type_error: "O campo is_admin deve ser booleano.",
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

/**
 * Schema de validação para restauração de item excluído logicamente
 */
export const restoreItemSchema = z.object({
  resource_type: z.enum(["conversation", "project"], {
    required_error: "O tipo de recurso (resource_type) é obrigatório.",
  }),
  resource_id: z
    .string({
      required_error: "O ID do recurso (resource_id) é obrigatório.",
    })
    .min(1, "O ID do recurso não pode ser vazio."),
});

export type RestoreItemInput = z.infer<typeof restoreItemSchema>;

/**
 * Schema de validação para bloqueio ou desbloqueio de usuário
 */
export const blockUserSchema = z.object({
  is_blocked: z.boolean({
    required_error: "O status de bloqueio (is_blocked) é obrigatório.",
    invalid_type_error: "O campo is_blocked deve ser booleano.",
  }),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;

