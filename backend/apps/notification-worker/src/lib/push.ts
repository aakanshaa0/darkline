import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";
import { env } from "@darkline/config";
import { logger } from "./logger";

/**
 * FCM is optional at runtime: FIREBASE_SERVICE_ACCOUNT_PATH is an optional
 * env var (packages/config), and a dev checkout won't have the JSON. Rather
 * than crash the worker on boot, initialisation is lazy and returns null
 * when unconfigured — the Kafka consumer still runs and logs what it *would*
 * have sent, which keeps the offline-delivery path exercisable without a
 * Firebase project.
 */
let messaging: admin.messaging.Messaging | null | undefined;

function getMessaging(): admin.messaging.Messaging | null {
  if (messaging !== undefined) return messaging;

  const configured = env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!configured) {
    logger.warn("FIREBASE_SERVICE_ACCOUNT_PATH not set — push sending disabled, notifications will only be logged");
    return (messaging = null);
  }

  const resolved = path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  if (!fs.existsSync(resolved)) {
    logger.warn({ path: resolved }, "Firebase service account file not found — push sending disabled");
    return (messaging = null);
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8")) as admin.ServiceAccount;
    const app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    logger.info("Firebase Admin initialised — push sending enabled");
    return (messaging = app.messaging());
  } catch (err) {
    logger.error({ err }, "Failed to initialise Firebase Admin — push sending disabled");
    return (messaging = null);
  }
}

export interface PushTarget {
  token: string;
  platform: "ios" | "android" | "web";
}

/**
 * Body is deliberately generic. Message content is end-to-end encrypted
 * (Part B.6) and the server cannot read it, so there is nothing meaningful
 * to put in the notification text — the client decrypts and rewrites the
 * notification on arrival.
 */
export async function sendMessagePush(
  targets: PushTarget[],
  data: { conversationId: string; messageId: string; senderId: string },
): Promise<{ sent: number; failed: number; staleTokens: string[] }> {
  if (targets.length === 0) return { sent: 0, failed: 0, staleTokens: [] };

  const fcm = getMessaging();
  if (!fcm) {
    logger.info({ tokens: targets.length, ...data }, "[push:disabled] would have sent message notification");
    return { sent: 0, failed: 0, staleTokens: [] };
  }

  const res = await fcm.sendEachForMulticast({
    tokens: targets.map((t) => t.token),
    notification: { title: "New message", body: "You have a new message" },
    data: { type: "message", ...data },
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default", contentAvailable: true } } },
  });

  // FCM reports per-token outcomes; unregistered/invalid tokens are dead
  // installs and must be pruned or they accumulate forever on the user doc.
  const staleTokens: string[] = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code ?? "";
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
      staleTokens.push(targets[i].token);
    } else {
      logger.warn({ err: r.error, token: targets[i].token.slice(0, 12) + "…" }, "Push delivery failed");
    }
  });

  return { sent: res.successCount, failed: res.failureCount, staleTokens };
}
