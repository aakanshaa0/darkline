import sodium from "libsodium-wrappers";
import type { SodiumLike } from "./types";

let readyPromise: Promise<SodiumLike> | null = null;

export function getSodium(): Promise<SodiumLike> {
  if (!readyPromise) {
    readyPromise = sodium.ready.then(() => sodium as unknown as SodiumLike);
  }
  return readyPromise;
}
