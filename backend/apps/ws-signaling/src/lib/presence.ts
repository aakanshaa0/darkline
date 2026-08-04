import { redis } from "./redis";
import type { PresenceUpdateEvent, PresenceStatus } from "@darkline/shared-types";

const PRESENCE_TTL_SEC = 120; // if a client disconnects uncleanly, presence still expires on its own

/**
 * Same Redis key scheme apps/api's GET /presence/:userId reads (Part D.2)
 * — that route is documented as "REST fallback; primary path is socket.io",
 * and this is the socket.io side that actually writes the key.
 */
export async function setPresence(userId: string, status: PresenceStatus): Promise<PresenceUpdateEvent> {
  const payload: PresenceUpdateEvent = { userId, status, updatedAt: new Date().toISOString() };
  await redis.set(`presence:${userId}`, JSON.stringify(payload), "EX", PRESENCE_TTL_SEC);
  return payload;
}
