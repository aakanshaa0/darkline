import type { Request, Response } from "express";
import { ConversationModel, UserModel } from "@darkline/db";
import { HttpError } from "../lib/HttpError";
import { publicProfile } from "../lib/serializers";
import type {
  createConversationSchema,
  updateConversationSchema,
  addMemberSchema,
} from "../validation/conversations.validation";
import type { z } from "zod";

// `any` here is intentional: Mongoose's generated Document/DocumentArray
// types for a schema with embedded subdocuments are deep and don't
// structurally match a plain hand-written shape (its own `.id` getter is
// even typed optional) — these are internal, non-exported helpers, so
// there's no external API surface losing type safety.
function isParticipant(conversation: any, userId?: string): boolean {
  return conversation.participants.some((p: any) => String(p.userId) === userId);
}

async function serializeConversation(conversation: any) {
  const users = await UserModel.find({ _id: { $in: conversation.participants.map((p: any) => p.userId) } });
  const userById = new Map(users.map((u) => [u.id, publicProfile(u)]));
  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name ?? null,
    photoUrl: conversation.photoUrl ?? null,
    lastMessageAt: conversation.lastMessageAt ?? null,
    participants: conversation.participants.map((p: any) => ({
      role: p.role,
      joinedAt: p.joinedAt,
      muted: p.muted,
      user: userById.get(String(p.userId)) ?? null,
    })),
  };
}

// ── GET /conversations ───────────────────────────────────────────────────
export async function listConversations(req: Request, res: Response) {
  const conversations = await ConversationModel.find({ "participants.userId": req.userId }).sort({
    lastMessageAt: -1,
  });
  res.json({ conversations: await Promise.all(conversations.map(serializeConversation)) });
}

// ── POST /conversations ──────────────────────────────────────────────────
export async function createConversation(req: Request, res: Response) {
  const { type, participantIds, name, photoUrl } = req.body as z.infer<typeof createConversationSchema>;

  const memberIds = Array.from(new Set([req.userId!, ...participantIds]));
  const users = await UserModel.find({ _id: { $in: memberIds } });
  if (users.length !== memberIds.length) throw new HttpError(400, "One or more users not found", "INVALID_MEMBERS");

  if (type === "direct") {
    if (memberIds.length !== 2) {
      throw new HttpError(400, "Direct conversations need exactly one other participant", "INVALID_DIRECT_SIZE");
    }
    const existing = await ConversationModel.findOne({
      type: "direct",
      "participants.userId": { $all: memberIds },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    });
    if (existing) return res.json({ conversation: await serializeConversation(existing) });
  }

  const conversation = await ConversationModel.create({
    type,
    name: type === "group" ? name : undefined,
    photoUrl: type === "group" ? photoUrl : undefined,
    createdBy: req.userId,
    participants: memberIds.map((userId) => ({
      userId,
      role: userId === req.userId ? "admin" : "member",
    })),
  });

  res.status(201).json({ conversation: await serializeConversation(conversation) });
}

// ── GET /conversations/:id ───────────────────────────────────────────────
export async function getConversation(req: Request, res: Response) {
  const conversation = await ConversationModel.findById(req.params.id);
  if (!conversation || !isParticipant(conversation, req.userId)) {
    throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }
  res.json({ conversation: await serializeConversation(conversation) });
}

// ── PATCH /conversations/:id ─────────────────────────────────────────────
export async function updateConversation(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateConversationSchema>;
  const conversation = await ConversationModel.findById(req.params.id);
  if (!conversation || !isParticipant(conversation, req.userId)) {
    throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }
  if (conversation.type !== "group") {
    throw new HttpError(400, "Only group conversations can be renamed", "NOT_A_GROUP");
  }
  const me = conversation.participants.find((p) => String(p.userId) === req.userId);
  if (me?.role !== "admin") throw new HttpError(403, "Only group admins can change settings", "NOT_ADMIN");

  Object.assign(conversation, body);
  await conversation.save();
  res.json({ conversation: await serializeConversation(conversation) });
}

// ── DELETE /conversations/:id — leave (group) or delete (direct) ────────
export async function deleteConversation(req: Request, res: Response) {
  const conversation = await ConversationModel.findById(req.params.id);
  if (!conversation || !isParticipant(conversation, req.userId)) {
    throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }

  if (conversation.type === "direct") {
    await conversation.deleteOne();
    return res.status(204).send();
  }

  conversation.participants = conversation.participants.filter((p) => String(p.userId) !== req.userId) as any;
  if (conversation.participants.length === 0) {
    await conversation.deleteOne();
  } else {
    await conversation.save();
  }
  res.status(204).send();
}

// ── POST /conversations/:id/members ──────────────────────────────────────
export async function addMember(req: Request, res: Response) {
  const { userId } = req.body as z.infer<typeof addMemberSchema>;
  const conversation = await ConversationModel.findById(req.params.id);
  if (!conversation || !isParticipant(conversation, req.userId)) {
    throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }
  if (conversation.type !== "group") throw new HttpError(400, "Only group conversations have members added", "NOT_A_GROUP");

  const target = await UserModel.findById(userId);
  if (!target) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

  if (!isParticipant(conversation, userId)) {
    conversation.participants.push({ userId, role: "member", joinedAt: new Date(), muted: false });
    await conversation.save();
  }
  res.json({ conversation: await serializeConversation(conversation) });
}

// ── DELETE /conversations/:id/members/:userId ────────────────────────────
export async function removeMember(req: Request, res: Response) {
  const conversation = await ConversationModel.findById(req.params.id);
  if (!conversation || !isParticipant(conversation, req.userId)) {
    throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }
  if (conversation.type !== "group") throw new HttpError(400, "Only group conversations have members removed", "NOT_A_GROUP");

  const me = conversation.participants.find((p) => String(p.userId) === req.userId);
  if (me?.role !== "admin" && req.params.userId !== req.userId) {
    throw new HttpError(403, "Only group admins can remove other members", "NOT_ADMIN");
  }

  conversation.participants = conversation.participants.filter((p) => String(p.userId) !== req.params.userId) as any;
  await conversation.save();
  res.json({ conversation: await serializeConversation(conversation) });
}
