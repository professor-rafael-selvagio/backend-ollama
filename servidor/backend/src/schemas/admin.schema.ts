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
