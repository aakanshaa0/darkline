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

const prekeyBundleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    identityKey: { type: String, required: true },
    signedPreKey: { type: signedPreKeySchema, required: true },
    oneTimePreKeys: { type: [oneTimePreKeySchema], default: [] },
  },
  { timestamps: true },
);

export type PrekeyBundle = InferSchemaType<typeof prekeyBundleSchema>;
export const PrekeyBundleModel = model("PrekeyBundle", prekeyBundleSchema);
