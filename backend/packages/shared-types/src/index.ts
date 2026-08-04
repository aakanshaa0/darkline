/**
 * Types shared across services: Kafka event payloads (Part F.4) and the
 * socket.io signaling event contract (Part D.3). Keeping these in one
 * package means the producer and every consumer agree on shape at compile time.
 */

export type TransportMode = "internet" | "local" | "ble";
export type PresenceStatus = "online" | "wifi" | "ble" | "offline";
export type CallKind = "audio" | "video" | "group";
export type CallStatus = "missed" | "declined" | "completed";

// ── Kafka: messages.new — producer: api/ws-signaling, partition key: conversationId ──
export interface MessageNewEvent {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientIds: string[];
  transportMode: TransportMode;
  createdAt: string; // ISO timestamp
  // Carried inline (not just a "go fetch it" notification) so fanout-worker
  // can deliver the actual message over the socket in one hop — ciphertext
  // is opaque to every hop between sender and recipient (Part B.6), so
  // relaying it isn't a zero-knowledge violation.
  ciphertext: string;
  attachments: Array<{ url: string; mimeType: string; sizeBytes?: number }>;
}

// ── Kafka: presence.updates — producer: ws-signaling, partition key: userId ──
export interface PresenceUpdateEvent {
  userId: string;
  status: PresenceStatus;
  updatedAt: string;
}

// ── Kafka: calls.events — producer: ws-signaling, partition key: conversationId ──
export interface CallEventPayload {
  callId: string;
  conversationId: string;
  kind: CallKind;
  status: CallStatus | "started";
  participantIds: string[];
  at: string;
}

// ── socket.io signaling channel (Part D.3) ──
export interface ServerToClientEvents {
  "presence:update": (payload: PresenceUpdateEvent) => void;
  "typing:start": (payload: { conversationId: string; userId: string }) => void;
  "typing:stop": (payload: { conversationId: string; userId: string }) => void;
  "message:new": (payload: MessageNewEvent) => void;
  "call:invite": (payload: { callId: string; conversationId: string; kind: CallKind; from: string }) => void;
  "call:answer": (payload: { callId: string }) => void;
  "call:reject": (payload: { callId: string }) => void;
  "call:end": (payload: { callId: string }) => void;
  "webrtc:offer": (payload: { callId: string; sdp: string }) => void;
  "webrtc:answer": (payload: { callId: string; sdp: string }) => void;
  "webrtc:ice-candidate": (payload: { callId: string; candidate: unknown }) => void;
}

export type ClientToServerEvents = ServerToClientEvents;
