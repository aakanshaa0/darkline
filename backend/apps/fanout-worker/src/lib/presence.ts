import Redis from "ioredis";
import { env } from "@darkline/config";
import type { PresenceUpdateEvent } from "@darkline/shared-types";

// Same Redis key scheme ws-signaling writes (apps/ws-signaling/src/lib/presence.ts)
// and GET /presence/:userId reads (apps/api/src/controllers/presence.controller.ts).
export const redis = new Redis(env.REDIS_URL);

export async function isOnline(userId: string): Promise<boolean> {
  const raw = await redis.get(`presence:${userId}`);
  if (!raw) return false;
  const presence = JSON.parse(raw) as PresenceUpdateEvent;
  return presence.status !== "offline";
}
