/**
 * The subset e2eeCore.ts actually calls, kept narrow and explicit rather
 * than `any` so a real mismatch between the two packages surfaces at
 * compile time instead of only at runtime on whichever platform wasn't
 * being tested.
 *
 * react-native-libsodium is *not* a complete drop-in for libsodium-wrappers,
 * despite the matching names: it omits crypto_sign_ed25519_sk_to_curve25519
 * (it ships only the pk_ direction). Every entry below is verified present
 * in BOTH packages — check react-native-libsodium/lib/typescript/lib.native.d.ts
 * before adding to this interface.
 */
export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface SodiumLike {
  ready: Promise<void>;
  crypto_sign_keypair(): KeyPair;
  crypto_box_keypair(): KeyPair;
  crypto_sign_detached(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
  crypto_sign_verify_detached(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
  crypto_box_seal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
  crypto_box_seal_open(ciphertext: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array;
  crypto_box_easy(message: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array;
  crypto_box_open_easy(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Uint8Array;
  crypto_secretbox_keygen(): Uint8Array;
  crypto_secretbox_easy(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  randombytes_buf(length: number): Uint8Array;
  crypto_box_NONCEBYTES: number;
  crypto_secretbox_NONCEBYTES: number;
  // Decoding goes through sodium, not TextDecoder: Hermes has no global
  // TextDecoder, so decryption threw ReferenceError on native while
  // encryption (TextEncoder, which Hermes does have) looked fine. There is
  // no matching from_string here — react-native-libsodium exports only the
  // to_string half — so encoding stays on TextEncoder.
  to_string(bytes: Uint8Array): string;
  to_base64(data: Uint8Array, variant?: number): string;
  from_base64(input: string, variant?: number): Uint8Array;
  base64_variants: { ORIGINAL: number };
}
