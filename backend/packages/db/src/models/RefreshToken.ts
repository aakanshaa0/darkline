import { Schema, model, type InferSchemaType } from "mongoose";

// Auth is otherwise stateless JWT (Part G.2) — this collection exists solely
// to support rotation/revocation on /auth/refresh-token and /auth/logout,
// not as a session store. TTL index reclaims expired rows automatically.
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshTokenModel = model("RefreshToken", refreshTokenSchema);
