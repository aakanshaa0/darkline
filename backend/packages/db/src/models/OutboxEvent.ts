import { Schema, model, type InferSchemaType } from "mongoose";

// Transactional outbox (Part F.4): write the event in the same transaction
// as the domain write, then a separate publisher process polls
// `publishedAt: null` and produces to Kafka — closes the write-then-publish
// ordering race without needing distributed transactions.
const outboxEventSchema = new Schema(
  {
    eventType: {
      type: String,
      enum: ["messages.new", "presence.updates", "calls.events"],
      required: true,
    },
    // conversationId for messages.new/calls.events, userId for presence.updates —
    // whatever Kafka partition key that topic uses (Part F.4).
    partitionKey: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

outboxEventSchema.index({ publishedAt: 1 });

export type OutboxEvent = InferSchemaType<typeof outboxEventSchema>;
export const OutboxEventModel = model("OutboxEvent", outboxEventSchema);
