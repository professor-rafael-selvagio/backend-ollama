import { z } from "zod";

// Validador de nome de modelo seguro (compatível com formato Ollama: [registry/][namespace/]model[:tag], bloqueia URLs, SSRF e path traversal)
const modelNameRegex = /^(?!.*\.\.)(?!.*:\/\/)[a-zA-Z0-9_\-\.]+(?:\/[a-zA-Z0-9_\-\.]+)*(?::[a-zA-Z0-9_\-\.]+)?$/;

export const generationOptionsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().min(0).max(100).optional(),
  num_predict: z.number().int().min(1).max(8192).optional(),
  repeat_penalty: z.number().min(0).max(3).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string().max(100)).max(10).optional(),
  seed: z.number().int().optional(),
});

export const generateRequestSchema = z.object({
  model: z
    .string({ required_error: "O nome do modelo é obrigatório" })
    .min(1, "O nome do modelo não pode ser vazio")
    .max(100, "Nome do modelo excede o limite permitido")
    .regex(modelNameRegex, "Nome do modelo contém caracteres inválidos"),
  prompt: z
    .string({ required_error: "O prompt é obrigatório" })
    .min(1, "O prompt não pode estar vazio")
    .max(50000, "O prompt excede o limite máximo de 50.000 caracteres"),
  system: z.string().max(20000, "O prompt de sistema excede o limite permitido").optional(),
  template: z.string().max(20000, "O template excede o limite permitido").optional(),
  context: z.array(z.number()).max(10000).optional(),
  options: generationOptionsSchema.optional(),
  stream: z.literal(false).default(false),
  keep_alive: z.union([z.string(), z.number()]).optional(),
});

export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"], {
    errorMap: () => ({ message: "O papel deve ser 'system', 'user' ou 'assistant'" }),
  }),
  content: z
    .string({ required_error: "O conteúdo da mensagem é obrigatório" })
    .min(1, "O conteúdo da mensagem não pode estar vazio")
    .max(50000, "A mensagem excede o limite máximo de 50.000 caracteres"),
  images: z.array(z.string()).max(5, "Máximo de 5 imagens por mensagem").optional(),
});

export const chatRequestSchema = z.object({
  model: z
    .string({ required_error: "O nome do modelo é obrigatório" })
    .min(1, "O nome do modelo não pode ser vazio")
    .max(100, "Nome do modelo excede o limite permitido")
    .regex(modelNameRegex, "Nome do modelo contém caracteres inválidos"),
  messages: z
    .array(chatMessageSchema, { required_error: "A lista de mensagens é obrigatória" })
    .min(1, "É necessário fornecer pelo menos uma mensagem")
    .max(100, "Limite de 100 mensagens por requisição excedido"),
  options: generationOptionsSchema.optional(),
  stream: z.literal(false).default(false),
  keep_alive: z.union([z.string(), z.number()]).optional(),
});

export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
