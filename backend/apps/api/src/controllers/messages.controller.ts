import type { Request, Response } from "express";
import { ConversationModel, MessageModel, OutboxEventModel } from "@darkline/db";
import type { MessageNewEvent } from "@darkline/shared-types";
import { HttpError } from "../lib/HttpError";
import { publishEvent } from "../lib/kafka";
import type {
  sendMessageSchema,
  syncMessagesSchema,
  editMessageSchema,
  listMessagesQuerySchema,
} from "../validation/messages.validation";
import type { z } from "zod";

async function requireParticipant(conversationId: string, userId?: string) {
  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation || !conversation.participants.some((p) => String(p.userId) === userId)) {
    throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }
  return conversation;
}

// `any` here for the same reason as conversations.controller.ts's serializeConversation.
async function publishMessageNew(message: any, recipientIds: string[]) {
  const payload: MessageNewEvent = {
    messageId: message.id,
    conversationId: String(message.conversationId),
    senderId: String(message.senderId),
    recipientIds,
    transportMode: message.transportMode as MessageNewEvent["transportMode"],
    createdAt: message.createdAt.toISOString(),
    ciphertext: message.ciphertext,
    attachments: (message.attachments ?? []).map((a: any) => ({
      url: a.url,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
  };
  await OutboxEventModel.create({
    eventType: "messages.new",
    partitionKey: payload.conversationId,
    payload,
  });
  await publishEvent("messages.new", payload.conversationId, payload);
}

// ── GET /conversations/:id/messages ──────────────────────────────────────
export async function listMessages(req: Request, res: Response) {
  await requireParticipant(req.params.id, req.userId);
  const { limit, before } = req.query as unknown as z.infer<typeof listMessagesQuerySchema>;

  const query: Record<string, unknown> = { conversationId: req.params.id, deletedAt: null };
  if (before) query.createdAt = { $lt: new Date(before) };

  const messages = await MessageModel.find(query).sort({ createdAt: -1 }).limit(limit);
  res.json({ messages: messages.reverse() });
}

// ── POST /conversations/:id/messages ─────────────────────────────────────
export async function sendMessage(req: Request, res: Response) {
  const conversation = await requireParticipant(req.params.id, req.userId);
  const body = req.body as z.infer<typeof sendMessageSchema>;

  const recipientIds = conversation.participants
    .map((p) => String(p.userId))
    .filter((id) => id !== req.userId);

  const message = await MessageModel.create({
    conversationId: conversation.id,
    senderId: req.userId,
    localId: body.localId,
    ciphertext: body.ciphertext,
    attachments: body.attachments ?? [],
    transportMode: body.transportMode,
    receipts: recipientIds.map((userId) => ({ userId, status: "sent" })),
  });

  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  await publishMessageNew(message, recipientIds);

  res.status(201).json({ message });
}

// ── POST /messages/sync — bulk offline reconciliation ────────────────────
export async function syncMessages(req: Request, res: Response) {
  const { messages } = req.body as z.infer<typeof syncMessagesSchema>;

  const results = [];
  for (const m of messages) {
    const conversation = await requireParticipant(m.conversationId, req.userId);
    const recipientIds = conversation.participants
      .map((p) => String(p.userId))
      .filter((id) => id !== req.userId);

    const message = await MessageModel.findOneAndUpdate(
      { conversationId: m.conversationId, localId: m.localId },
      {
        $setOnInsert: {
          conversationId: m.conversationId,
          senderId: req.userId,
          localId: m.localId,
          ciphertext: m.ciphertext,
          attachments: m.attachments ?? [],
          transportMode: m.transportMode,
          receipts: recipientIds.map((userId) => ({ userId, status: "sent" })),
        },
      },
      { upsert: true, new: true },
    );

    conversation.lastMessageAt = message.createdAt;
    await conversation.save();
    await publishMessageNew(message, recipientIds);

    results.push({ localId: m.localId, id: message.id, createdAt: message.createdAt });
  }

  res.json({ synced: results });
}

// ── PATCH /messages/:id — edit or soft-delete ────────────────────────────
export async function editMessage(req: Request, res: Response) {
  const body = req.body as z.infer<typeof editMessageSchema>;
  const message = await MessageModel.findById(req.params.id);
  if (!message || String(message.senderId) !== req.userId) {
    throw new HttpError(404, "Message not found", "MESSAGE_NOT_FOUND");
  }

  if (body.delete) {
    message.deletedAt = new Date();
  } else if (body.ciphertext) {
    message.ciphertext = body.ciphertext;
    message.editedAt = new Date();
  }
  await message.save();

  res.json({ message });
}
