import { z } from "zod";

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const createProjectSchema = z.object({
  name: z
    .string({ required_error: "O nome do projeto é obrigatório" })
    .trim()
    .min(1, "O nome do projeto não pode ser vazio")
    .max(100, "O nome do projeto deve ter no máximo 100 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "A descrição deve ter no máximo 500 caracteres")
    .optional()
    .nullable(),
  color: z
    .string()
    .trim()
    .regex(hexColorRegex, "Cor inválida. Use formato hexadecimal (ex: #3B82F6)")
    .default("#3B82F6"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "O nome do projeto não pode ser vazio")
    .max(100, "O nome do projeto deve ter no máximo 100 caracteres")
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "A descrição deve ter no máximo 500 caracteres")
    .optional()
    .nullable(),
  color: z
    .string()
    .trim()
    .regex(hexColorRegex, "Cor inválida. Use formato hexadecimal (ex: #3B82F6)")
    .optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectIdParamSchema = z.object({
  id: z
    .string({ required_error: "ID do projeto é obrigatório" })
    .uuid("ID do projeto deve ser um UUID válido"),
});

