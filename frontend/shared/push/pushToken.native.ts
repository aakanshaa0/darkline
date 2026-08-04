import { Platform } from "react-native";
import type { PushTokenProvider } from "./types";

/**
 * NOT YET WIRED TO FIREBASE. Returning null means registerForPush() skips
 * the device-token upload, so the backend simply has nothing to push to —
 * everything else (Kafka event, presence split, notification-worker) already
 * works and is exercised by the "[push:disabled]" log line.
 *
 * To enable, install @react-native-firebase/app + @react-native-firebase/messaging,
 * drop google-services.json into android/app/ (GoogleService-Info.plist for
 * iOS), rebuild the native app, and replace getToken() below with:
 *
 *   import messaging from "@react-native-firebase/messaging";
 *   const status = await messaging().requestPermission();
 *   const granted =
 *     status === messaging.AuthorizationStatus.AUTHORIZED ||
 *     status === messaging.AuthorizationStatus.PROVISIONAL;
 *   return granted ? await messaging().getToken() : null;
 *
 * Nothing outside this file needs to change — shared/push/index.ts resolves
 * the platform variant and appStore only calls registerForPush().
 */
export const pushTokenProvider: PushTokenProvider = {
  platform: Platform.OS === "ios" ? "ios" : "android",
  async getToken() {
    return null;
  },
};
