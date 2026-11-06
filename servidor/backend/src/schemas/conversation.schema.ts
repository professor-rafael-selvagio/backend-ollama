import { z } from "zod";
import { generationOptionsSchema } from "./ollama.schema";

const modelNameRegex = /^(?!.*\.\.)(?!.*:\/\/)[a-zA-Z0-9_\-\.]+(?:\/[a-zA-Z0-9_\-\.]+)*(?::[a-zA-Z0-9_\-\.]+)?$/;

export const createConversationSchema = z.object({
  model: z
    .string({ required_error: "O modelo da conversa é obrigatório" })
    .min(1, "O nome do modelo não pode ser vazio")
    .max(100, "Nome do modelo excede o limite")
    .regex(modelNameRegex, "Nome do modelo contém caracteres inválidos"),
  title: z
    .string()
    .min(1, "O título não pode ser vazio")
    .max(100, "O título não pode ter mais de 100 caracteres")
    .optional(),
});

export const updateConversationSchema = z.object({
  title: z
    .string({ required_error: "O novo título é obrigatório" })
    .min(1, "O título não pode estar vazio")
    .max(100, "O título não pode ter mais de 100 caracteres"),
});

export const sendMessageSchema = z.object({
  content: z
    .string({ required_error: "O conteúdo da mensagem é obrigatório" })
    .min(1, "A mensagem não pode estar vazia")
    .max(50000, "A mensagem excede o limite máximo de 50.000 caracteres"),
  options: generationOptionsSchema.optional(),
});

export const conversationIdParamSchema = z.object({
  id: z.string().min(1, "ID da conversa inválido"),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

