import { OAuth2Client } from "google-auth-library";
import { env } from "@darkline/config";
import { HttpError } from "./HttpError";

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Verifies a Google Sign-In ID token (OAuth 2.0 / OpenID Connect) against
 * Google's public keys — the client SDK handles the actual OAuth consent
 * flow and hands us this token; we never see or store Google credentials.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new HttpError(500, "Google sign-in is not configured", "GOOGLE_NOT_CONFIGURED");
  }
  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new HttpError(401, "Invalid Google ID token", "INVALID_GOOGLE_TOKEN");
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    avatarUrl: payload.picture,
  };
}
