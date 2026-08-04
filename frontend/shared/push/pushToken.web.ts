import type { PushTokenProvider } from "./types";

/**
 * NOT YET WIRED TO FIREBASE — same shape and same reasoning as
 * pushToken.native.ts.
 *
 * Web push additionally needs a service worker and a VAPID key, so enabling
 * it is three steps rather than one:
 *   1. public/firebase-messaging-sw.js registering the FCM SW
 *   2. a VAPID public key from Firebase console → Cloud Messaging → Web Push
 *   3. replace getToken() below with:
 *
 *        import { getMessaging, getToken } from "firebase/messaging";
 *        if (!("Notification" in window)) return null;
 *        if ((await Notification.requestPermission()) !== "granted") return null;
 *        const sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
 *        return await getToken(getMessaging(), {
 *          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
 *          serviceWorkerRegistration: sw,
 *        });
 */
export const pushTokenProvider: PushTokenProvider = {
  platform: "web",
  async getToken() {
    return null;
  },
};
