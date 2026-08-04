import rateLimit from "express-rate-limit";

/** Tighter limit for credential-guessing-prone endpoints (login, OTP, password reset). */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
