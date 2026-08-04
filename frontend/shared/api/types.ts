/**
 * Response shapes mirrored from the backend (backend/apps/api/src/controllers/*)
 * rather than imported — frontend and backend are independently
 * deployable (matching the reasoning in backend/apps/ws-signaling's
 * lib/jwt.ts), so this is a deliberate, small duplication instead of a
 * cross-repo dependency.
 */

export interface ApiUser {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  googleId?: string;
  avatarUrl?: string;
  status: "active" | "locked";
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
  isNewUser?: boolean;
}

export interface PublicProfile {
  id: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
}

export interface ConversationParticipant {
  role: "member" | "admin";
  joinedAt: string;
  muted: boolean;
  user: PublicProfile | null;
}

export interface ApiConversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  photoUrl: string | null;
  lastMessageAt: string | null;
  participants: ConversationParticipant[];
}

export interface ApiMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  localId: string;
  ciphertext: string;
  attachments: Array<{ url: string; mimeType: string; sizeBytes?: number }>;
  transportMode: "internet" | "local" | "ble";
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
}

export interface ApiCall {
  _id: string;
  conversationId: string;
  participants: string[];
  kind: "audio" | "video" | "group";
  mode: "internet" | "local";
  initiatedBy: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  status: "ongoing" | "missed" | "declined" | "completed";
}

export interface ApiContact {
  id: string;
  status: "pending" | "accepted" | "blocked";
  source: "search" | "nearby-wifi" | "nearby-ble" | "qr";
  user: PublicProfile | null;
}

export interface FetchedPrekeyBundleDto {
  identityKey: string;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  oneTimePreKey: { keyId: number; publicKey: string } | null;
}

/**
 * GET /keys/prekeys/:userId — one entry per registered device. The top-level
 * fields mirror `bundles[0]` for older readers; `bundles` is what senders
 * should use so every device gets a copy.
 */
export interface FetchedPrekeyBundlesDto extends FetchedPrekeyBundleDto {
  bundles?: FetchedPrekeyBundleDto[];
}

export interface PresenceDto {
  userId: string;
  status: "online" | "wifi" | "ble" | "offline";
  updatedAt: string | null;
}
