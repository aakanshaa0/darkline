import { redis } from "./redis";

/**
 * call:answer/reject/end and webrtc:offer/answer/ice-candidate only carry
 * a callId (Part D.3), not the conversation/participants — this is the
 * lookup that lets the server know who else to relay to. Written once on
 * call:invite, read on every subsequent event for that call, deleted on
 * call:end.
 */
const CALL_SESSION_TTL_SEC = 60 * 60;

export interface CallSession {
  conversationId: string;
  participantIds: string[];
}

export async function createCallSession(callId: string, session: CallSession): Promise<void> {
  await redis.set(`callsession:${callId}`, JSON.stringify(session), "EX", CALL_SESSION_TTL_SEC);
}

export async function getCallSession(callId: string): Promise<CallSession | null> {
  const raw = await redis.get(`callsession:${callId}`);
  return raw ? (JSON.parse(raw) as CallSession) : null;
}

export async function deleteCallSession(callId: string): Promise<void> {
  await redis.del(`callsession:${callId}`);
}
