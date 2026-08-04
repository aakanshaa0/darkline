// Verified on a real Android build: the identity persists across restarts,
// so a device keeps one long-lived E2EE identity. Note the consequence —
// identity is per-device and uploading a bundle overwrites the published
// one, so signing in on a second device makes the first device's ciphertext
// undecryptable. Multi-device needs per-device sessions. Uses the
// OS keychain (Keychain on iOS, Keystore-backed on Android), matching the
// "private keys generated/stored in Keychain/Keystore, never transmitted"
// requirement in the architecture doc (Part B.6).
import * as Keychain from "react-native-keychain";

const SERVICE = "darkline.e2ee.identity";

export async function saveIdentityJson(json: string): Promise<void> {
  await Keychain.setGenericPassword("darkline", json, { service: SERVICE });
}

export async function loadIdentityJson(): Promise<string | null> {
  const result = await Keychain.getGenericPassword({ service: SERVICE });
  return result ? result.password : null;
}

export async function clearIdentityJson(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
