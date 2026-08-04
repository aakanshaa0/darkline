import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_.]+$/)
    .optional(),
  avatarUrl: z.string().url().optional(),
});

export const deviceTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android", "web"]),
});

export const linkAccountSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("google"), idToken: z.string().min(1) }),
  z.object({ provider: z.literal("phone"), phone: z.string().min(6).max(20), code: z.string().length(6) }),
]);
