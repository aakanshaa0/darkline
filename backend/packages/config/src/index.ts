import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

/**
 * Every service imports `env` from this package instead of reading
 * `process.env` directly, so a missing/malformed var fails fast at
 * startup instead of surfacing as an obscure runtime error later.
 *
 * Loads backend/.env by a fixed path relative to this compiled file
 * (dist/index.js → packages/config → packages → backend), rather than
 * relying on process.cwd() — turbo runs each package's script from that
 * package's own directory, not the repo root, so a cwd-relative lookup
 * would miss the root .env entirely for every service except one running
 * directly from backend/.
 */
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  MONGODB_URI: z.string().url().or(z.string().startsWith("mongodb")),

  REDIS_URL: z.string().min(1),

  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().default("darkline-backend"),

  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  GOOGLE_CLIENT_ID: z.string().optional(),

  TURN_URL: z.string().optional(),
  TURN_SECRET: z.string().optional(),

  // Outbound SMS (phone OTP). Unset → lib/sms.ts logs the code instead of
  // sending, which is what keeps the phone-auth flow usable in dev.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Outbound email (verification codes, password reset). Same fallback.
  SENDGRID_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),

  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),

  API_PORT: z.coerce.number().default(4000),
  WS_SIGNALING_PORT: z.coerce.number().default(4001),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}

export const env = loadEnv();
