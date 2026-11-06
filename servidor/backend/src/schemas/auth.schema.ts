import { z } from "zod";

/**
 * Schema de validação para registro de novo usuário
 */
export const registerSchema = z.object({
  email: z
    .string({ required_error: "O e-mail é obrigatório" })
    .email("Formato de e-mail inválido")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "A senha é obrigatória" })
    .min(6, "A senha deve conter no mínimo 6 caracteres")
    .max(72, "A senha deve conter no máximo 72 caracteres"),
  name: z
    .string()
    .trim()
    .min(1, "O nome não pode ser vazio")
    .max(100, "O nome pode ter no máximo 100 caracteres")
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema de validação para login de usuário
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "O e-mail é obrigatório" })
    .email("Formato de e-mail inválido")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "A senha é obrigatória" })
    .min(1, "A senha é obrigatória"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema de validação para renovação de sessão (refresh token)
 */
export const refreshTokenSchema = z.object({
  refresh_token: z
    .string({ required_error: "O refresh_token é obrigatório" })
    .min(1, "O refresh_token não pode ser vazio"),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Schema de validação para alteração de senha
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: "A senha atual é obrigatória" })
    .min(1, "A senha atual é obrigatória"),
  newPassword: z
    .string({ required_error: "A nova senha é obrigatória" })
    .min(6, "A nova senha deve conter no mínimo 6 caracteres")
    .max(72, "A nova senha deve conter no máximo 72 caracteres"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Schema de validação para atualização de perfil do usuário
 */
export const updateProfileSchema = z.object({
  name: z
    .string({ required_error: "O nome completo é obrigatório" })
    .trim()
    .min(2, "O nome deve conter no mínimo 2 caracteres")
    .max(100, "O nome pode ter no máximo 100 caracteres"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;



