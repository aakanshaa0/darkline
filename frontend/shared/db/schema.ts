import { appSchema, tableSchema } from "@nozbe/watermelondb";

/**
 * Local-first store (Part B.2 "Local-first message store, sync queue",
 * Part D.4). Deliberately narrower than the full server schema
 * (packages/db in the backend) — this only holds what's needed to render
 * the UI instantly and queue writes made while offline; it is not a full
 * mirror of MongoDB.
 */
export const appSchema_ = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "local_conversations",
      columns: [
        { name: "server_id", type: "string", isIndexed: true }, // Mongo _id once known; empty until the conversation itself has synced
        { name: "type", type: "string" }, // "direct" | "group"
        { name: "name", type: "string", isOptional: true },
        { name: "last_message_at", type: "number", isOptional: true },
      ],
    }),
    tableSchema({
      name: "local_messages",
      columns: [
        { name: "conversation_id", type: "string", isIndexed: true }, // local_conversations.id (WatermelonDB row id)
        { name: "server_id", type: "string", isOptional: true, isIndexed: true }, // Mongo _id once synced
        { name: "local_id", type: "string", isIndexed: true }, // client-generated id, matches Message.localId server-side (Part D.2 /messages/sync)
        { name: "sender_id", type: "string" },
        { name: "ciphertext", type: "string" },
        { name: "transport_mode", type: "string" },
        { name: "status", type: "string" }, // "pending" | "sent" | "failed" — Part D.4
        { name: "created_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "local_calls",
      columns: [
        { name: "server_id", type: "string", isOptional: true, isIndexed: true },
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "kind", type: "string" },
        { name: "mode", type: "string" },
        { name: "status", type: "string" },
        { name: "started_at", type: "number" },
        { name: "duration_sec", type: "number", isOptional: true },
      ],
    }),
  ],
});
