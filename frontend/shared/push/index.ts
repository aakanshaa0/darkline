import { usersApi } from "@shared/api";
import { pushTokenProvider } from "./pushToken";

export type { PushTokenProvider, PushPlatform } from "./types";
export { pushTokenProvider };

/**
 * Uploads this device's push token so notification-worker has somewhere to
 * deliver to when the user is offline. Safe to call on every sign-in:
 * POST /users/me/device-token pulls any existing row for the same token
 * before inserting, so re-registering doesn't duplicate.
 *
 * A null token (push unavailable or not yet configured — see the platform
 * pushToken files) is not an error; it just means this device won't receive
 * push, and everything else continues to work.
 */
export async function registerForPush(): Promise<boolean> {
  try {
    const token = await pushTokenProvider.getToken();
    if (!token) return false;
    await usersApi.addDeviceToken({ token, platform: pushTokenProvider.platform });
    return true;
  } catch {
    // Never block sign-in on push registration.
    return false;
  }
}
