import { getSodium } from "./sodium";
import { generateIdentity, toUploadableBundle, type LocalIdentity, type UploadablePrekeyBundle } from "./e2eeCore";
import { serializeIdentity, deserializeIdentity } from "./serialization";
import { saveIdentityJson, loadIdentityJson } from "./keyStore";

export * from "./types";
export * from "./e2eeCore";
export { getSodium };

/**
 * The one entry point most call sites need: returns this device's local
 * identity, generating and persisting one on first run. The
 * `UploadablePrekeyBundle` is only returned when an identity was freshly
 * created — the caller (shared/api) is responsible for POSTing it to
 * /keys/prekeys; this module doesn't make network calls itself.
 */
export async function loadOrCreateIdentity(): Promise<{
  identity: LocalIdentity;
  freshBundle: UploadablePrekeyBundle | null;
}> {
  const sodium = await getSodium();
  const existingJson = await loadIdentityJson();
  if (existingJson) {
    return { identity: deserializeIdentity(sodium, JSON.parse(existingJson)), freshBundle: null };
  }

  const identity = generateIdentity(sodium);
  await saveIdentityJson(JSON.stringify(serializeIdentity(sodium, identity)));
  return { identity, freshBundle: toUploadableBundle(sodium, identity) };
}
