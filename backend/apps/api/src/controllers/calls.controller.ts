import type { Request, Response } from "express";
import { CallModel, ConversationModel, OutboxEventModel } from "@darkline/db";
import type { CallEventPayload } from "@darkline/shared-types";
import { HttpError } from "../lib/HttpError";
import { publishEvent } from "../lib/kafka";
import type { createCallSchema, updateCallSchema, listCallsQuerySchema } from "../validation/calls.validation";
import type { z } from "zod";

// `any` here for the same reason as conversations.controller.ts's serializeConversation.
async function publishCallEvent(call: any) {
  const payload: CallEventPayload = {
    callId: call.id,
    conversationId: String(call.conversationId),
    kind: call.kind as CallEventPayload["kind"],
    status: call.status as CallEventPayload["status"],
    participantIds: call.participants.map(String),
    at: new Date().toISOString(),
  };
  await OutboxEventModel.create({ eventType: "calls.events", partitionKey: payload.conversationId, payload });
  await publishEvent("calls.events", payload.conversationId, payload);
}

// ── POST /calls — log call start ─────────────────────────────────────────
export async function createCall(req: Request, res: Response) {
  const { conversationId, kind, mode, participantIds } = req.body as z.infer<typeof createCallSchema>;

  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation || !conversation.participants.some((p) => String(p.userId) === req.userId)) {
    throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }

  const call = await CallModel.create({
    conversationId,
    participants: participantIds,
    kind,
    mode,
    initiatedBy: req.userId,
    status: "ongoing",
  });

  await publishCallEvent({ ...call.toObject(), id: call.id, status: "started" });
  res.status(201).json({ call });
}

// ── PATCH /calls/:id — log call end/duration/mode ────────────────────────
export async function updateCall(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateCallSchema>;
  const call = await CallModel.findById(req.params.id);
  if (!call || !call.participants.some((p) => String(p) === req.userId)) {
    throw new HttpError(404, "Call not found", "CALL_NOT_FOUND");
  }

  call.status = body.status;
  call.endedAt = new Date();
  call.durationSec = body.durationSec ?? Math.round((call.endedAt.getTime() - call.startedAt!.getTime()) / 1000);
  await call.save();

  await publishCallEvent(call.toObject());
  res.json({ call });
}

// ── GET /calls — paginated call history ──────────────────────────────────
export async function listCalls(req: Request, res: Response) {
  const { limit, before } = req.query as unknown as z.infer<typeof listCallsQuerySchema>;

  const query: Record<string, unknown> = { participants: req.userId };
  if (before) query.startedAt = { $lt: new Date(before) };

  const calls = await CallModel.find(query).sort({ startedAt: -1 }).limit(limit);
  res.json({ calls });
}
