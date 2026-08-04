import { Schema, model, type InferSchemaType } from "mongoose";

// Embedded per-member state (role/mute/joinedAt) — covers group admin controls
// (Part C.3 "Group info") without a separate membership collection.
const participantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["member", "admin"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
    muted: { type: Boolean, default: false },
  },
  { _id: false },
);

const conversationSchema = new Schema(
  {
    type: { type: String, enum: ["direct", "group"], required: true },
    name: { type: String }, // group only
    photoUrl: { type: String }, // group only
    participants: { type: [participantSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
);

conversationSchema.index({ "participants.userId": 1 });

export type Conversation = InferSchemaType<typeof conversationSchema>;
export const ConversationModel = model("Conversation", conversationSchema);
