import type { Server, Socket } from "socket.io";
import { ContactModel, ConversationModel } from "@darkline/db";
import type { PresenceStatus, CallKind } from "@darkline/shared-types";
import { setPresence } from "../lib/presence";
import { createCallSession, getCallSession, deleteCallSession } from "../lib/callSessions";
import { logger } from "../lib/logger";

function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Everyone who has this user as a contact — the "broadcast to contacts" audience for presence (Part D.3). */
async function getContactOwnerIds(userId: string): Promise<string[]> {
  const contacts = await ContactModel.find({ contactUserId: userId }).select("ownerUserId");
  return contacts.map((c) => String(c.ownerUserId));
}

async function broadcastPresence(io: Server, userId: string, status: PresenceStatus) {
  const payload = await setPresence(userId, status);
  const ownerIds = await getContactOwnerIds(userId);
  for (const ownerId of ownerIds) {
    io.to(userRoom(ownerId)).emit("presence:update", payload);
  }
}

async function getOtherParticipantIds(conversationId: string, exceptUserId: string): Promise<string[]> {
  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation) return [];
  return conversation.participants.map((p) => String(p.userId)).filter((id) => id !== exceptUserId);
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  const userId: string = socket.data.userId;
  socket.join(userRoom(userId));

  broadcastPresence(io, userId, "online").catch((err) => logger.error({ err }, "presence broadcast failed"));

  socket.on("disconnect", () => {
    broadcastPresence(io, userId, "offline").catch((err) => logger.error({ err }, "presence broadcast failed"));
  });

  // Client-reported presence — the server can observe "connected at all",
  // but only the client knows whether that connection is over the
  // internet, a local WiFi-direct link, or BLE mesh (Part B.3).
  socket.on("presence:update", ({ status }: { status: PresenceStatus }) => {
    broadcastPresence(io, userId, status).catch((err) => logger.error({ err }, "presence broadcast failed"));
  });

  socket.on("typing:start", async ({ conversationId }: { conversationId: string }) => {
    const others = await getOtherParticipantIds(conversationId, userId);
    others.forEach((id) => io.to(userRoom(id)).emit("typing:start", { conversationId, userId }));
  });

  socket.on("typing:stop", async ({ conversationId }: { conversationId: string }) => {
    const others = await getOtherParticipantIds(conversationId, userId);
    others.forEach((id) => io.to(userRoom(id)).emit("typing:stop", { conversationId, userId }));
  });

  // message:new is NOT handled here as an inbound client event — messages
  // are sent via REST (POST /conversations/:id/messages), and delivery to
  // online recipients happens via fanout-worker's redis-emitter publishing
  // into this same socket.io/Redis-adapter namespace (Part F.6 step 6).

  socket.on(
    "call:invite",
    async ({ callId, conversationId, kind }: { callId: string; conversationId: string; kind: CallKind }) => {
      const others = await getOtherParticipantIds(conversationId, userId);
      await createCallSession(callId, { conversationId, participantIds: [userId, ...others] });
      others.forEach((id) => io.to(userRoom(id)).emit("call:invite", { callId, conversationId, kind, from: userId }));
    },
  );

  async function relayToCallPeers(callId: string, event: string, payload: Record<string, unknown>) {
    const session = await getCallSession(callId);
    if (!session) return;
    session.participantIds
      .filter((id) => id !== userId)
      .forEach((id) => io.to(userRoom(id)).emit(event, payload));
  }

  socket.on("call:answer", ({ callId }: { callId: string }) => {
    relayToCallPeers(callId, "call:answer", { callId }).catch((err) => logger.error({ err }, "call:answer relay failed"));
  });

  socket.on("call:reject", ({ callId }: { callId: string }) => {
    relayToCallPeers(callId, "call:reject", { callId })
      .then(() => deleteCallSession(callId))
      .catch((err) => logger.error({ err }, "call:reject relay failed"));
  });

  socket.on("call:end", ({ callId }: { callId: string }) => {
    relayToCallPeers(callId, "call:end", { callId })
      .then(() => deleteCallSession(callId))
      .catch((err) => logger.error({ err }, "call:end relay failed"));
  });

  socket.on("webrtc:offer", ({ callId, sdp }: { callId: string; sdp: string }) => {
    relayToCallPeers(callId, "webrtc:offer", { callId, sdp }).catch((err) => logger.error({ err }, "webrtc:offer relay failed"));
  });

  socket.on("webrtc:answer", ({ callId, sdp }: { callId: string; sdp: string }) => {
    relayToCallPeers(callId, "webrtc:answer", { callId, sdp }).catch((err) => logger.error({ err }, "webrtc:answer relay failed"));
  });

  socket.on("webrtc:ice-candidate", ({ callId, candidate }: { callId: string; candidate: unknown }) => {
    relayToCallPeers(callId, "webrtc:ice-candidate", { callId, candidate }).catch((err) =>
      logger.error({ err }, "webrtc:ice-candidate relay failed"),
    );
  });
}
