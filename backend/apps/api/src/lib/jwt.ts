import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "@darkline/config";

// @types/jsonwebtoken types `expiresIn` as a branded `StringValue` template
// literal, not `string` — env vars are plain strings by nature (validated
// at startup by @darkline/config's zod schema instead), so this local cast
// is the boundary between the two.
function expiresIn(ttl: string): SignOptions["expiresIn"] {
  return ttl as SignOptions["expiresIn"];
}

export interface AccessTokenPayload {
  sub: string; // userId
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string; // userId
  type: "refresh";
  jti: string; // unique token id, so each issued refresh token has a distinct hash to store/revoke
}

export function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { sub: userId, type: "access" };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiresIn(env.JWT_ACCESS_TTL) });
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const payload: RefreshTokenPayload = { sub: userId, type: "refresh", jti };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: expiresIn(env.JWT_REFRESH_TTL) });
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/**
 * Refresh tokens are stored (and looked up on rotation/logout) by this hash,
 * never in plaintext — sha256 is fine here since it just needs to be a fast,
 * deterministic lookup key, not a slow password-style hash.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** TTL string like "30d"/"15m" → a Date that far in the future, for RefreshToken.expiresAt. */
export function ttlToExpiryDate(ttl: string): Date {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) throw new Error(`Unsupported TTL format: ${ttl}`);
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return new Date(Date.now() + value * unitMs);
}
