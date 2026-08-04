import type { Request, Response } from "express";
import { redis } from "../lib/redis";

// ── GET /presence/:userId ────────────────────────────────────────────────
// REST fallback — the primary path is the socket.io `presence:update`
// broadcast from ws-signaling, which is also what writes this Redis key.
export async function getPresence(req: Request, res: Response) {
  const raw = await redis.get(`presence:${req.params.userId}`);
  if (!raw) return res.json({ userId: req.params.userId, status: "offline", updatedAt: null });
  res.json(JSON.parse(raw));
}
