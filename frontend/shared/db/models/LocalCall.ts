import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

export class LocalCall extends Model {
  static table = "local_calls";

  @text("server_id") serverId?: string;
  @text("conversation_id") conversationId!: string;
  @text("kind") kind!: "audio" | "video" | "group";
  @text("mode") mode!: "internet" | "local";
  @text("status") status!: "ongoing" | "missed" | "declined" | "completed";
  @field("started_at") startedAt!: number;
  @field("duration_sec") durationSec?: number;
}
