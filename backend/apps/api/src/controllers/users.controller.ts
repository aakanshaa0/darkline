import type { Request, Response } from "express";
import { UserModel } from "@darkline/db";
import { HttpError } from "../lib/HttpError";
import { redis } from "../lib/redis";
import { verifyGoogleIdToken } from "../lib/googleAuth";
import { sanitizeUser, publicProfile } from "../lib/serializers";
import type { updateMeSchema, deviceTokenSchema, linkAccountSchema } from "../validation/users.validation";
import type { z } from "zod";

// ── GET /users/me ────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId);
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  res.json({ user: sanitizeUser(user) });
}

// ── PATCH /users/me ──────────────────────────────────────────────────────
export async function updateMe(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateMeSchema>;

  if (body.username) {
    const taken = await UserModel.findOne({ username: body.username, _id: { $ne: req.userId } });
    if (taken) throw new HttpError(409, "Username is already taken", "USERNAME_TAKEN");
  }

  const user = await UserModel.findByIdAndUpdate(req.userId, body, { new: true });
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  res.json({ user: sanitizeUser(user) });
}

// ── GET /users/:id ────────────────────────────────────────────────────────
export async function getUserById(req: Request, res: Response) {
  const user = await UserModel.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  res.json({ user: publicProfile(user) });
}

// ── GET /users/search?q= ────────────────────────────────────────────────
export async function searchUsers(req: Request, res: Response) {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ users: [] });

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const users = await UserModel.find({
    $or: [{ username: regex }, { name: regex }],
    _id: { $ne: req.userId },
  }).limit(20);

  res.json({ users: users.map(publicProfile) });
}

// ── POST /users/me/device-token ─────────────────────────────────────────
export async function addDeviceToken(req: Request, res: Response) {
  const { token, platform } = req.body as z.infer<typeof deviceTokenSchema>;

  await UserModel.updateOne({ _id: req.userId }, { $pull: { deviceTokens: { token } } });
  await UserModel.updateOne(
    { _id: req.userId },
    { $push: { deviceTokens: { token, platform, updatedAt: new Date() } } },
  );

  res.status(204).send();
}

// ── GET /users/me/linked-accounts ───────────────────────────────────────
export async function getLinkedAccounts(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId);
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

  res.json({
    email: { linked: !!user.email, value: user.email ?? null },
    phone: { linked: !!user.phone, value: user.phone ?? null },
    google: { linked: !!user.googleId },
  });
}

// ── POST /users/me/linked-accounts ──────────────────────────────────────
export async function linkAccount(req: Request, res: Response) {
  const body = req.body as z.infer<typeof linkAccountSchema>;
  const user = await UserModel.findById(req.userId);
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

  if (body.provider === "google") {
    const profile = await verifyGoogleIdToken(body.idToken);
    const existing = await UserModel.findOne({ googleId: profile.googleId, _id: { $ne: user.id } });
    if (existing) throw new HttpError(409, "That Google account is already linked to another user", "GOOGLE_ALREADY_LINKED");
    user.googleId = profile.googleId;
  } else {
    const attemptsKey = `otp-attempts:${body.phone}`;
    const otpKey = `otp:${body.phone}`;
    const stored = await redis.get(otpKey);
    if (!stored || stored !== body.code) {
      await redis.multi().incr(attemptsKey).expire(attemptsKey, 300).exec();
      throw new HttpError(400, "Incorrect code", "INVALID_CODE");
    }
    await redis.del(otpKey, attemptsKey);
    const existing = await UserModel.findOne({ phone: body.phone, _id: { $ne: user.id } });
    if (existing) throw new HttpError(409, "That phone number is already linked to another user", "PHONE_ALREADY_LINKED");
    user.phone = body.phone;
    user.phoneVerified = true;
  }

  await user.save();
  res.json({ user: sanitizeUser(user) });
}

// ── DELETE /users/me/linked-accounts/:provider ──────────────────────────
export async function unlinkAccount(req: Request, res: Response) {
  const provider = req.params.provider as "email" | "phone" | "google";
  const user = await UserModel.findById(req.userId);
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

  const remainingMethods = [
    provider === "email" ? null : user.passwordHash,
    provider === "phone" ? null : user.phone,
    provider === "google" ? null : user.googleId,
  ].filter(Boolean);
  if (remainingMethods.length === 0) {
    throw new HttpError(400, "Can't unlink your only sign-in method", "LAST_AUTH_METHOD");
  }

  if (provider === "email") {
    user.email = undefined;
    user.passwordHash = undefined;
  } else if (provider === "phone") {
    user.phone = undefined;
    user.phoneVerified = false;
  } else {
    user.googleId = undefined;
  }

  await user.save();
  res.json({ user: sanitizeUser(user) });
}
