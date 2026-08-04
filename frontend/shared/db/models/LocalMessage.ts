import { Model } from "@nozbe/watermelondb";
import { field, text, relation } from "@nozbe/watermelondb/decorators";
import type { LocalConversation } from "./LocalConversation";

export type LocalMessageStatus = "pending" | "sent" | "failed";

export class LocalMessage extends Model {
  static table = "local_messages";
  static associations = {
    local_conversations: { type: "belongs_to" as const, key: "conversation_id" },
  };

  @text("conversation_id") conversationId!: string;
  @text("server_id") serverId?: string;
  @text("local_id") localId!: string;
  @text("sender_id") senderId!: string;
  @text("ciphertext") ciphertext!: string;
  @text("transport_mode") transportMode!: "internet" | "local" | "ble";
  @text("status") status!: LocalMessageStatus;
  @field("created_at") createdAt!: number;

  @relation("local_conversations", "conversation_id") conversation!: LocalConversation;
}
