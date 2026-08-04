import { Schema, model, type InferSchemaType } from "mongoose";

// Per-recipient delivery/read state — one entry per participant, covers
// group chats as well as 1:1 (Part C.2 "Message info").
const receiptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Client-generated ULID, set before the server ack — reconciled via
    // POST /messages/sync (Part D.2) for offline-first send.
    localId: { type: String, required: true },
    ciphertext: { type: String, required: true }, // opaque E2EE blob; server never sees plaintext
    attachments: { type: [attachmentSchema], default: [] },
    receipts: { type: [receiptSchema], default: [] },
    transportMode: { type: String, enum: ["internet", "local", "ble"], required: true },
    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

// conversationId first: it's the shard-key candidate (Part G.2) and the
// query pattern is always "messages in this conversation, newest first".
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, localId: 1 }, { unique: true });

export type Message = InferSchemaType<typeof messageSchema>;
export const MessageModel = model("Message", messageSchema);
