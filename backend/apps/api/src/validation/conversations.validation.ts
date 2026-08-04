import { z } from "zod";

export const createConversationSchema = z.object({
  type: z.enum(["direct", "group"]),
  participantIds: z.array(z.string().min(1)).min(1),
  name: z.string().min(1).max(100).optional(),
  photoUrl: z.string().url().optional(),
});

export const updateConversationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  photoUrl: z.string().url().optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
});
