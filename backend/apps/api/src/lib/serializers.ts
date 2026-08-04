import type { HydratedDocument } from "mongoose";
import type { User } from "@darkline/db";

export function sanitizeUser(user: HydratedDocument<User>) {
  const obj = user.toObject() as Record<string, unknown>;
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
}

/** Narrower shape for surfacing another user's profile (contacts, search, conversation members). */
export function publicProfile(user: HydratedDocument<User>) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}
