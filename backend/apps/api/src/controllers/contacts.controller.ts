import type { Request, Response } from "express";
import { ContactModel, UserModel } from "@darkline/db";
import { HttpError } from "../lib/HttpError";
import { publicProfile } from "../lib/serializers";
import type { createContactSchema } from "../validation/contacts.validation";
import type { z } from "zod";

// ── GET /contacts ────────────────────────────────────────────────────────
export async function listContacts(req: Request, res: Response) {
  const contacts = await ContactModel.find({ ownerUserId: req.userId }).sort({ createdAt: -1 });
  const users = await UserModel.find({ _id: { $in: contacts.map((c) => c.contactUserId) } });
  const userById = new Map(users.map((u) => [u.id, publicProfile(u)]));

  res.json({
    contacts: contacts.map((c) => ({
      id: c.id,
      status: c.status,
      source: c.source,
      user: userById.get(String(c.contactUserId)) ?? null,
    })),
  });
}

// ── POST /contacts ───────────────────────────────────────────────────────
// No separate accept/reject endpoint exists in the route spec, so a new
// contact is created already-accepted rather than left permanently pending.
export async function createContact(req: Request, res: Response) {
  const { contactUserId, source } = req.body as z.infer<typeof createContactSchema>;

  if (contactUserId === req.userId) {
    throw new HttpError(400, "Can't add yourself as a contact", "INVALID_CONTACT");
  }
  const target = await UserModel.findById(contactUserId);
  if (!target) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

  const contact = await ContactModel.findOneAndUpdate(
    { ownerUserId: req.userId, contactUserId },
    { $setOnInsert: { ownerUserId: req.userId, contactUserId, source, status: "accepted" } },
    { upsert: true, new: true },
  );

  res.status(201).json({ contact: { id: contact.id, status: contact.status, source: contact.source, user: publicProfile(target) } });
}

// ── DELETE /contacts/:id ─────────────────────────────────────────────────
export async function deleteContact(req: Request, res: Response) {
  const result = await ContactModel.deleteOne({ _id: req.params.id, ownerUserId: req.userId });
  if (result.deletedCount === 0) throw new HttpError(404, "Contact not found", "CONTACT_NOT_FOUND");
  res.status(204).send();
}
