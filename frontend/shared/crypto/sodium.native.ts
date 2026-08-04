// NOTE: unverified in this environment — react-native-libsodium needs a
// real native build (Xcode/Android toolchain, physical device or
// emulator) to actually run; none of that is available here. It's built
// as a drop-in for libsodium-wrappers' API (same function names/shapes,
// see ./types.ts), but that claim hasn't been exercised against a real
// build of this package. Verify this file once the native project exists
// and can actually run — see docs/setup/frontend-setup.md.
import sodium from "react-native-libsodium";
import type { SodiumLike } from "./types";

let readyPromise: Promise<SodiumLike> | null = null;

export function getSodium(): Promise<SodiumLike> {
  if (!readyPromise) {
    readyPromise = sodium.ready.then(() => sodium as unknown as SodiumLike);
  }
  return readyPromise;
}
