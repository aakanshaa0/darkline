import { Emitter } from "@socket.io/redis-emitter";
import Redis from "ioredis";
import { env } from "@darkline/config";

/**
 * Publishes into the same Redis pub/sub channel @socket.io/redis-adapter
 * subscribes to in ws-signaling (Part F.6 step 6) — this process never
 * holds a socket.io connection itself, it just injects events into rooms
 * that ws-signaling instances are already serving.
 */
export const emitter = new Emitter(new Redis(env.REDIS_URL));

export function userRoom(userId: string): string {
  return `user:${userId}`;
}
