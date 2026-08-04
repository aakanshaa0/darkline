import type { Request, Response } from "express";
import { UserModel, RefreshTokenModel } from "@darkline/db";
import { env } from "@darkline/config";
import { HttpError } from "../lib/HttpError";
import { hashPassword, comparePassword } from "../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, ttlToExpiryDate } from "../lib/jwt";
import { redis } from "../lib/redis";
import { generateNumericCode, generateOpaqueToken } from "../lib/otp";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/mailer";
import { sendOtpSms } from "../lib/sms";
import { verifyGoogleIdToken } from "../lib/googleAuth";
import { sanitizeUser } from "../lib/serializers";
import type {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  phoneSendOtpSchema,
  phoneVerifyOtpSchema,
  googleAuthSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../validation/auth.validation";
import type { z } from "zod";

const EMAIL_VERIFY_TTL_SEC = 15 * 60;
const PASSWORD_RESET_TTL_SEC = 30 * 60;
const OTP_TTL_SEC = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;
const LOGIN_MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

async function issueTokenPair(userId: string) {
  const accessToken = signAccessToken(userId);
  const { token: refreshToken } = signRefreshToken(userId);
  await RefreshTokenModel.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: ttlToExpiryDate(env.JWT_REFRESH_TTL),
  });
  return { accessToken, refreshToken };
}

// ── POST /auth/signup ──────────────────────────────────────────────────
export async function signup(req: Request, res: Response) {
  const { name, username, email, password } = req.body as z.infer<typeof signupSchema>;

  const existing = await UserModel.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw new HttpError(409, "Email or username is already in use", "ACCOUNT_EXISTS");
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ name, username, email, passwordHash });

  const code = generateNumericCode();
  await redis.set(`email-verify:${user.id}`, code, "EX", EMAIL_VERIFY_TTL_SEC);
  await sendVerificationEmail(email, code);

  res.status(201).json({ userId: user.id, email: user.email });
}

// ── POST /auth/verify-email ────────────────────────────────────────────
export async function verifyEmail(req: Request, res: Response) {
  const { userId, code } = req.body as z.infer<typeof verifyEmailSchema>;

  const key = `email-verify:${userId}`;
  const stored = await redis.get(key);
  if (!stored || stored !== code) {
    throw new HttpError(400, "Invalid or expired code", "INVALID_CODE");
  }
  await redis.del(key);

  const user = await UserModel.findByIdAndUpdate(userId, { emailVerified: true }, { new: true });
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

  const tokens = await issueTokenPair(user.id);
  res.json({ ...tokens, user: sanitizeUser(user) });
}

// ── POST /auth/login ────────────────────────────────────────────────────
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await UserModel.findOne({ email });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.status === "locked") {
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new HttpError(423, "Account is temporarily locked. Try again later.", "ACCOUNT_LOCKED");
    }
    // Lock has expired — clear it and let this attempt proceed normally.
    user.status = "active";
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
      user.status = "locked";
      user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
    if (user.status === "locked") {
      throw new HttpError(423, "Account is temporarily locked. Try again later.", "ACCOUNT_LOCKED");
    }
    throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  user.failedLoginAttempts = 0;
  await user.save();

  const tokens = await issueTokenPair(user.id);
  res.json({ ...tokens, user: sanitizeUser(user) });
}

// ── POST /auth/forgot-password ─────────────────────────────────────────
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as z.infer<typeof forgotPasswordSchema>;

  const user = await UserModel.findOne({ email });
  if (user) {
    const token = generateOpaqueToken();
    await redis.set(`pwd-reset:${hashToken(token)}`, user.id, "EX", PASSWORD_RESET_TTL_SEC);
    await sendPasswordResetEmail(email, token);
  }
  // Same response whether or not the email exists — avoids leaking account existence.
  res.json({ message: "If that email exists, we've sent a reset link." });
}

// ── POST /auth/reset-password ──────────────────────────────────────────
export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body as z.infer<typeof resetPasswordSchema>;

  const key = `pwd-reset:${hashToken(token)}`;
  const userId = await redis.get(key);
  if (!userId) throw new HttpError(400, "Invalid or expired reset token", "INVALID_RESET_TOKEN");
  await redis.del(key);

  const passwordHash = await hashPassword(newPassword);
  await UserModel.findByIdAndUpdate(userId, {
    passwordHash,
    failedLoginAttempts: 0,
    status: "active",
    lockedUntil: null,
  });

  res.json({ message: "Password updated" });
}

// ── POST /auth/phone/send-otp ──────────────────────────────────────────
export async function phoneSendOtp(req: Request, res: Response) {
  const { phone } = req.body as z.infer<typeof phoneSendOtpSchema>;

  const code = generateNumericCode();
  await redis.set(`otp:${phone}`, code, "EX", OTP_TTL_SEC);
  await redis.del(`otp-attempts:${phone}`);
  await sendOtpSms(phone, code);

  res.json({ message: "OTP sent" });
}

// ── POST /auth/phone/verify-otp ────────────────────────────────────────
export async function phoneVerifyOtp(req: Request, res: Response) {
  const { phone, code } = req.body as z.infer<typeof phoneVerifyOtpSchema>;

  const attemptsKey = `otp-attempts:${phone}`;
  const attempts = Number((await redis.get(attemptsKey)) ?? 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, "Too many attempts. Request a new code.", "TOO_MANY_ATTEMPTS");
  }

  const otpKey = `otp:${phone}`;
  const stored = await redis.get(otpKey);
  if (!stored || stored !== code) {
    await redis.multi().incr(attemptsKey).expire(attemptsKey, OTP_TTL_SEC).exec();
    throw new HttpError(400, "Incorrect code", "INVALID_CODE");
  }
  await redis.del(otpKey, attemptsKey);

  let user = await UserModel.findOne({ phone });
  let isNewUser = false;
  if (!user) {
    user = await UserModel.create({ phone, phoneVerified: true });
    isNewUser = true;
  } else if (!user.phoneVerified) {
    user.phoneVerified = true;
    await user.save();
  }

  const tokens = await issueTokenPair(user.id);
  res.json({ ...tokens, user: sanitizeUser(user), isNewUser });
}

// ── POST /auth/google ───────────────────────────────────────────────────
export async function googleAuth(req: Request, res: Response) {
  const { idToken } = req.body as z.infer<typeof googleAuthSchema>;
  const profile = await verifyGoogleIdToken(idToken);

  let user = await UserModel.findOne({ googleId: profile.googleId });
  let isNewUser = false;

  if (!user) {
    const existingByEmail = await UserModel.findOne({ email: profile.email });
    if (existingByEmail && !existingByEmail.googleId) {
      throw new HttpError(
        409,
        "An account already exists with this email using a different sign-in method",
        "ACCOUNT_EXISTS_DIFFERENT_METHOD",
      );
    }
    user = await UserModel.create({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      emailVerified: true,
    });
    isNewUser = true;
  }

  const tokens = await issueTokenPair(user.id);
  res.json({ ...tokens, user: sanitizeUser(user), isNewUser });
}

// ── POST /auth/refresh-token ────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response) {
  const { refreshToken: token } = req.body as z.infer<typeof refreshTokenSchema>;

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  const tokenHash = hashToken(token);
  const stored = await RefreshTokenModel.findOne({ userId: payload.sub, tokenHash });
  if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "Refresh token is no longer valid", "INVALID_REFRESH_TOKEN");
  }

  // Rotate: revoke the used token, issue a fresh pair.
  stored.revokedAt = new Date();
  await stored.save();

  const tokens = await issueTokenPair(payload.sub);
  res.json(tokens);
}

// ── POST /auth/logout ───────────────────────────────────────────────────
export async function logout(req: Request, res: Response) {
  const { refreshToken: token } = req.body as z.infer<typeof logoutSchema>;
  await RefreshTokenModel.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { revokedAt: new Date() });
  res.status(204).send();
}

// ── GET /auth/me ─────────────────────────────────────────────────────────
export async function me(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId);
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  res.json({ user: sanitizeUser(user) });
}
