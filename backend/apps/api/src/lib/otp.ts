import crypto from "node:crypto";

/** Six-digit numeric code, e.g. for email verification and phone OTP. */
export function generateNumericCode(length = 6): string {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(length, "0");
}

/** Opaque high-entropy token, e.g. for password-reset links. */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
