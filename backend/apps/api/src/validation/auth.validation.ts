import { z } from "zod";

const password = z.string().min(8, "Password must be at least 8 characters");

export const signupSchema = z.object({
  name: z.string().min(1).max(100),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_.]+$/, "Username may only contain lowercase letters, numbers, '.' and '_'"),
  email: z.string().email(),
  password,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  userId: z.string().min(1),
  code: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});

export const phoneSendOtpSchema = z.object({
  phone: z.string().min(6).max(20),
});

export const phoneVerifyOtpSchema = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().length(6),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});
