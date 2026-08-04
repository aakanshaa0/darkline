import { z } from "zod";

const attachmentSchema = z.object({
  url: z.string().url(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().nonnegative().optional(),
});

export const sendMessageSchema = z.object({
  localId: z.string().min(1),
  ciphertext: z.string().min(1),
  transportMode: z.enum(["internet", "local", "ble"]),
  attachments: z.array(attachmentSchema).optional(),
});

export const syncMessagesSchema = z.object({
  messages: z
    .array(
      z.object({
        conversationId: z.string().min(1),
        localId: z.string().min(1),
        ciphertext: z.string().min(1),
        transportMode: z.enum(["internet", "local", "ble"]),
        attachments: z.array(attachmentSchema).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const editMessageSchema = z.object({
  ciphertext: z.string().min(1).optional(),
  delete: z.boolean().optional(),
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: z.string().datetime().optional(),
});
