import { Schema, model, type InferSchemaType } from "mongoose";

const callSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    participants: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    kind: { type: String, enum: ["audio", "video", "group"], required: true },
    mode: { type: String, enum: ["internet", "local"], required: true },
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationSec: { type: Number },
    // "ongoing" is the initial state written by POST /calls when a call
    // starts; PATCH /calls/:id sets the final status once it ends.
    status: { type: String, enum: ["ongoing", "missed", "declined", "completed"], default: "ongoing" },
  },
  { timestamps: true },
);

callSchema.index({ conversationId: 1, startedAt: -1 });

export type Call = InferSchemaType<typeof callSchema>;
export const CallModel = model("Call", callSchema);
