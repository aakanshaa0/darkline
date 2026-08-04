import { Schema, model, type InferSchemaType } from "mongoose";

// X3DH bootstrap material (Part B.6 / D.2 `/keys/prekeys`). Only public
// keys ever live here — private keys stay device-side in Keychain/Keystore.
const signedPreKeySchema = new Schema(
  {
    keyId: { type: Number, required: true },
    publicKey: { type: String, required: true },
    signature: { type: String, required: true },
  },
  { _id: false },
);

const oneTimePreKeySchema = new Schema(
  {
    keyId: { type: Number, required: true },
    publicKey: { type: String, required: true },
    used: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * One document per DEVICE, not per user. `userId` was previously unique,
 * which meant a user's second device overwrote the first's bundle — every
 * message then went to whichever device published last and was undecryptable
 * everywhere else. `identityKey` is per-device and already sent on upload, so
 * it doubles as the device discriminator without the client needing to invent
 * a device id.
 */
const prekeyBundleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    identityKey: { type: String, required: true },
    signedPreKey: { type: signedPreKeySchema, required: true },
    oneTimePreKeys: { type: [oneTimePreKeySchema], default: [] },
  },
  { timestamps: true },
);

prekeyBundleSchema.index({ userId: 1, identityKey: 1 }, { unique: true });

export type PrekeyBundle = InferSchemaType<typeof prekeyBundleSchema>;
export const PrekeyBundleModel = model("PrekeyBundle", prekeyBundleSchema);
