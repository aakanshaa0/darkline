// NOTE: unverified in this environment — see sodium.native.ts. Uses the
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
