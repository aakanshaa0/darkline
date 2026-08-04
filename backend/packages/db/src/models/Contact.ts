import { Schema, model, Types, type InferSchemaType } from "mongoose";

const contactSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contactUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending" },
    source: {
      type: String,
      enum: ["search", "nearby-wifi", "nearby-ble", "qr"],
      required: true,
    },
  },
  { timestamps: true },
);

contactSchema.index({ ownerUserId: 1, contactUserId: 1 }, { unique: true });

export type Contact = InferSchemaType<typeof contactSchema>;
export const ContactModel = model("Contact", contactSchema);
export { Types };
