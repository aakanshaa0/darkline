import type { SodiumLike } from "./types";

/**
 * Real X25519/Ed25519 authenticated encryption (libsodium crypto_box_seal +
 * crypto_sign), simplified from full X3DH per the scope decision: no
 * ephemeral-per-session key, no Double Ratchet — so there's no per-message
 * forward secrecy yet. Genuinely confidential and tamper-evident today;
 * ratcheting is a real, separately-scoped follow-up, not attempted here.
 *
 * Confidentiality and authenticity are carried by two separate primitives
 * rather than one authenticated DH: a sealed box to the recipient's signed
 * prekey (confidentiality, with an ephemeral sender keypair libsodium
 * generates internally) plus a detached Ed25519 signature over the
 * ciphertext (authenticity). The more usual trick — one Ed25519 identity
 * keypair serving both signing and DH via `crypto_sign_ed25519_*_to_curve25519`
 * — is not available: react-native-libsodium implements only the `pk_` half
 * of that conversion, so any sender-side DH derivation throws on native.
 *
 * One-time prekeys are still generated, uploaded, and consumed
 * server-side (GET /keys/prekeys/:userId marks one used per fetch, per
 * X3DH convention) but are not yet folded into the derived shared secret
 * — wiring that in is a straightforward follow-up (an extra DH term +
 * combining via crypto_generichash) that wasn't done in this pass.
 */

export interface RawKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface LocalIdentity {
  identity: RawKeyPair; // ed25519 — signing, and (via conversion) DH
  signedPreKey: { keyId: number; keyPair: RawKeyPair }; // x25519
  signedPreKeySignature: Uint8Array;
  oneTimePreKeys: Array<{ keyId: number; keyPair: RawKeyPair }>;
}

export interface UploadablePrekeyBundle {
  identityKey: string; // base64 ed25519 public key
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
}

export interface FetchedPrekeyBundle {
  identityKey: string;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  oneTimePreKey: { keyId: number; publicKey: string } | null;
}

export interface Envelope {
  ciphertext: string; // base64 — crypto_box_seal to the recipient's signed prekey
  signature: string; // base64 — crypto_sign_detached over the raw ciphertext, proving who sent it
  senderIdentityKey: string; // base64 ed25519 public key — the key `signature` is verified against
}

function toB64(sodium: SodiumLike, bytes: Uint8Array): string {
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

function fromB64(sodium: SodiumLike, str: string): Uint8Array {
  return sodium.from_base64(str, sodium.base64_variants.ORIGINAL);
}

export function generateIdentity(sodium: SodiumLike, oneTimeCount = 10): LocalIdentity {
  const identity = sodium.crypto_sign_keypair();
  const signedPreKeyPair = sodium.crypto_box_keypair();
  const signedPreKeySignature = sodium.crypto_sign_detached(signedPreKeyPair.publicKey, identity.privateKey);
  const oneTimePreKeys = Array.from({ length: oneTimeCount }, (_, i) => ({
    keyId: i + 1,
    keyPair: sodium.crypto_box_keypair(),
  }));

  return {
    identity,
    signedPreKey: { keyId: 1, keyPair: signedPreKeyPair },
    signedPreKeySignature,
    oneTimePreKeys,
  };
}

export function toUploadableBundle(sodium: SodiumLike, local: LocalIdentity): UploadablePrekeyBundle {
  return {
    identityKey: toB64(sodium, local.identity.publicKey),
    signedPreKey: {
      keyId: local.signedPreKey.keyId,
      publicKey: toB64(sodium, local.signedPreKey.keyPair.publicKey),
      signature: toB64(sodium, local.signedPreKeySignature),
    },
    oneTimePreKeys: local.oneTimePreKeys.map((k) => ({
      keyId: k.keyId,
      publicKey: toB64(sodium, k.keyPair.publicKey),
    })),
  };
}

/** Throws if the signed prekey's signature doesn't verify against the published identity key. */
function verifiedSignedPreKeyPublic(sodium: SodiumLike, bundle: FetchedPrekeyBundle): Uint8Array {
  const identityPublic = fromB64(sodium, bundle.identityKey);
  const signedPreKeyPublic = fromB64(sodium, bundle.signedPreKey.publicKey);
  const signature = fromB64(sodium, bundle.signedPreKey.signature);

  const valid = sodium.crypto_sign_verify_detached(signature, signedPreKeyPublic, identityPublic);
  if (!valid) {
    throw new Error("Signed prekey signature verification failed — refusing to encrypt to an unverified key");
  }
  return signedPreKeyPublic;
}

/**
 * Sealed box + detached signature rather than a box_easy DH between the
 * sender's identity key and the recipient's signed prekey: deriving the
 * sender's X25519 secret needs crypto_sign_ed25519_sk_to_curve25519, which
 * react-native-libsodium does not implement, so the DH form threw on every
 * native send. crypto_box_seal generates its own ephemeral sender keypair,
 * so no conversion is needed — and since a sealed box is anonymous, the
 * detached signature is what carries sender authenticity.
 */
export function encryptForRecipient(
  sodium: SodiumLike,
  plaintext: string,
  recipientBundle: FetchedPrekeyBundle,
  myIdentity: LocalIdentity,
): Envelope {
  const recipientSignedPreKeyPublic = verifiedSignedPreKeyPublic(sodium, recipientBundle);

  const message = new TextEncoder().encode(plaintext);
  const ciphertext = sodium.crypto_box_seal(message, recipientSignedPreKeyPublic);
  const signature = sodium.crypto_sign_detached(ciphertext, myIdentity.identity.privateKey);

  return {
    ciphertext: toB64(sodium, ciphertext),
    signature: toB64(sodium, signature),
    senderIdentityKey: toB64(sodium, myIdentity.identity.publicKey),
  };
}

export function decryptFromSender(sodium: SodiumLike, envelope: Envelope, myIdentity: LocalIdentity): string {
  const senderIdentityPublic = fromB64(sodium, envelope.senderIdentityKey);
  const ciphertext = fromB64(sodium, envelope.ciphertext);

  // Verify before opening: a sealed box is anonymous, so an unverified
  // envelope proves nothing about who wrote it.
  const valid = sodium.crypto_sign_verify_detached(fromB64(sodium, envelope.signature), ciphertext, senderIdentityPublic);
  if (!valid) {
    throw new Error("Message signature verification failed — refusing to decrypt an unauthenticated envelope");
  }

  const plaintext = sodium.crypto_box_seal_open(
    ciphertext,
    myIdentity.signedPreKey.keyPair.publicKey,
    myIdentity.signedPreKey.keyPair.privateKey,
  );
  return sodium.to_string(plaintext);
}

// ── Group chat: Sender Keys (Part B.6) ────────────────────────────────────
// Each member encrypts once per outgoing message with their own symmetric
// key; that key is distributed to every other member individually via the
// same 1:1 encryptForRecipient/decryptFromSender above.

export interface GroupEnvelope {
  ciphertext: string;
  nonce: string;
}

export function generateSenderKey(sodium: SodiumLike): Uint8Array {
  return sodium.crypto_secretbox_keygen();
}

export function encryptGroupMessage(sodium: SodiumLike, plaintext: string, senderKey: Uint8Array): GroupEnvelope {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const message = new TextEncoder().encode(plaintext);
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, senderKey);
  return { ciphertext: toB64(sodium, ciphertext), nonce: toB64(sodium, nonce) };
}

export function decryptGroupMessage(sodium: SodiumLike, envelope: GroupEnvelope, senderKey: Uint8Array): string {
  const plaintext = sodium.crypto_secretbox_open_easy(
    fromB64(sodium, envelope.ciphertext),
    fromB64(sodium, envelope.nonce),
    senderKey,
  );
  return sodium.to_string(plaintext);
}

export function senderKeyToB64(sodium: SodiumLike, key: Uint8Array): string {
  return toB64(sodium, key);
}

export function senderKeyFromB64(sodium: SodiumLike, b64: string): Uint8Array {
  return fromB64(sodium, b64);
}
