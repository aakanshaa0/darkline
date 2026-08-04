// NOTE: unverified in this environment — same caveat as shared/crypto/keyStore.native.ts.
import * as Keychain from "react-native-keychain";

const SERVICE = "darkline.auth.tokens";

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Keychain.setGenericPassword("darkline", JSON.stringify({ accessToken, refreshToken }), { service: SERVICE });
}

export async function loadTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const result = await Keychain.getGenericPassword({ service: SERVICE });
  return result ? JSON.parse(result.password) : null;
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
