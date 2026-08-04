import { Model } from "@nozbe/watermelondb";
import { field, text, children } from "@nozbe/watermelondb/decorators";

export class LocalConversation extends Model {
  static table = "local_conversations";
  static associations = {
    local_messages: { type: "has_many" as const, foreignKey: "conversation_id" },
  };

  @text("server_id") serverId!: string;
  @text("type") type!: "direct" | "group";
  @text("name") name?: string;
  @field("last_message_at") lastMessageAt?: number;

  @children("local_messages") messages!: unknown;
}
