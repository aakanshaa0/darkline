import { z } from "zod";

export const createCallSchema = z.object({
  conversationId: z.string().min(1),
  kind: z.enum(["audio", "video", "group"]),
  mode: z.enum(["internet", "local"]),
  participantIds: z.array(z.string().min(1)).min(1),
});

export const updateCallSchema = z.object({
  status: z.enum(["missed", "declined", "completed"]),
  durationSec: z.number().nonnegative().optional(),
});

export const listCallsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: z.string().datetime().optional(),
});
