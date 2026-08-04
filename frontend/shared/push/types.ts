export type PushPlatform = "ios" | "android" | "web";

export interface PushTokenProvider {
  /**
   * Resolves the device's push token, or null when push is unavailable —
   * permission denied, no Firebase config for this platform, or running
   * somewhere push doesn't exist (simulator, unsupported browser).
   */
  getToken(): Promise<string | null>;
  platform: PushPlatform;
}
