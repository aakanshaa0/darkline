import Redis from "ioredis";
import { env } from "@darkline/config";

/**
 * Single shared connection for short-lived auth material (email-verify
 * codes, password-reset tokens, phone OTPs + attempt counters) — none of
 * this belongs in MongoDB, see packages/db/src/models — it's all TTL'd and
 * throwaway by design.
 */
export const redis = new Redis(env.REDIS_URL);
