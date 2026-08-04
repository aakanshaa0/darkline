import Redis from "ioredis";
import { env } from "@darkline/config";

/** Separate from the socket.io Redis-adapter connections (server.ts) — this one is for app data (presence, call sessions). */
export const redis = new Redis(env.REDIS_URL);
