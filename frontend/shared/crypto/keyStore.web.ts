// Web has no OS keychain equivalent — localStorage is a deliberately
// weaker trust boundary for private keys than mobile's Keychain/Keystore,
// called out as an accepted limitation in the architecture doc (Part E.2:
// "web is a weaker trust boundary for private keys than mobile"). A
// browser Web Crypto + IndexedDB-with-non-extractable-keys approach would
// be stronger but is a bigger change than this pass covers.
const STORAGE_KEY = "darkline.e2ee.identity";

export async function saveIdentityJson(json: string): Promise<void> {
  localStorage.setItem(STORAGE_KEY, json);
}

export async function loadIdentityJson(): Promise<string | null> {
  return localStorage.getItem(STORAGE_KEY);
}

export async function clearIdentityJson(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
}
