// Verified on a real Android build (emulator, RN 0.75 / Hermes): sodium.ready
// resolves and the primitives in ./types.ts work.
//
// The "drop-in for libsodium-wrappers" claim does NOT hold in full, so treat
// ./types.ts as the contract rather than libsodium-wrappers' own surface.
// Confirmed gaps in react-native-libsodium: no crypto_sign_ed25519_sk_to_curve25519
// (only the pk_ direction) and no from_string (only to_string). Both were
// silent runtime failures, not type errors.
import sodium from "react-native-libsodium";
import type { SodiumLike } from "./types";

let readyPromise: Promise<SodiumLike> | null = null;

export function getSodium(): Promise<SodiumLike> {
  if (!readyPromise) {
    readyPromise = sodium.ready.then(() => sodium as unknown as SodiumLike);
  }
  return readyPromise;
}
