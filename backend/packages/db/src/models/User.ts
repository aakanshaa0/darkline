import { Schema, model, type InferSchemaType } from "mongoose";

const deviceTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ["ios", "android", "web"], required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    // name/username are optional at the schema level (not just in the UI):
    // phone and Google sign-in create the auth record before profile setup
    // runs, so a user can briefly exist with neither set.
    name: { type: String, trim: true },
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    phone: { type: String, unique: true, sparse: true, trim: true },
    phoneVerified: { type: Boolean, default: false },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String },
    deviceTokens: { type: [deviceTokenSchema], default: [] },
    status: { type: String, enum: ["active", "locked"], default: "active" },
    failedLoginAttempts: { type: Number, default: 0 },
    // Auto-expiring lock (Part C.1 #14): set on repeated failed logins,
    // checked and cleared lazily on the next login attempt once it's passed.
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
