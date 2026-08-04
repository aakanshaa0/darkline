/**
 * Both react-native-libsodium (native) and libsodium-wrappers (web) expose
 * the same function names/shapes by design — react-native-libsodium is
 * built as a drop-in native replacement for the WASM build. This is the
 * subset e2eeCore.ts actually calls, kept narrow and explicit rather than
 * `any` so a real type mismatch between the two packages still surfaces
 * at compile time instead of only at runtime on whichever platform wasn't
 * being tested.
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
  crypto_sign_ed25519_sk_to_curve25519(privateKey: Uint8Array): Uint8Array;
  crypto_sign_ed25519_pk_to_curve25519(publicKey: Uint8Array): Uint8Array;
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
  to_base64(data: Uint8Array, variant?: number): string;
  from_base64(input: string, variant?: number): Uint8Array;
  base64_variants: { ORIGINAL: number };
}
