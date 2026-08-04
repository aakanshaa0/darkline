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
  ciphertext: string; // base64 — crypto_box_seal to the recipient's FIRST device (kept for older readers)
  /**
   * One sealed copy per registered recipient device, `ciphertext` included.
   * A sealed box can only be opened by the device holding the matching
   * prekey, so a single copy meant only the recipient's most recently
   * published device could read the message. Absent on older envelopes.
   */
  ciphertexts?: string[];
  signature: string; // base64 — crypto_sign_detached over the ciphertext list, proving who sent it
  senderIdentityKey: string; // base64 ed25519 public key — the key `signature` is verified against
  /**
   * A second sealed box of the same plaintext, to the SENDER's own signed
   * prekey. `ciphertext` is sealed to the recipient, so the sender genuinely
   * cannot read back what it sent — without this, a sender's own messages are
   * unrecoverable after a reload (they previously survived only in an
   * in-memory Map, hence "Sent message (unavailable after reload)").
   *
   * Optional so envelopes written before this existed still parse; those
   * older messages stay unreadable to the sender, which is unavoidable.
   */
  selfCiphertext?: string;
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
/** Signed material: the ciphertext list joined, so the signature covers every copy. */
function signedPayload(sodium: SodiumLike, ciphertexts: string[]): Uint8Array {
  return new TextEncoder().encode(ciphertexts.join("."));
}

export function encryptForRecipient(
  sodium: SodiumLike,
  plaintext: string,
  recipientBundles: FetchedPrekeyBundle | FetchedPrekeyBundle[],
  myIdentity: LocalIdentity,
): Envelope {
  const bundles = Array.isArray(recipientBundles) ? recipientBundles : [recipientBundles];
  if (bundles.length === 0) throw new Error("No recipient device bundles — cannot encrypt");

  const message = new TextEncoder().encode(plaintext);

  // One sealed copy per device. Each bundle's signed prekey is verified
  // against that same bundle's identity key before it's used.
  const ciphertexts = bundles.map((bundle) =>
    toB64(sodium, sodium.crypto_box_seal(message, verifiedSignedPreKeyPublic(sodium, bundle))),
  );

  const signature = sodium.crypto_sign_detached(
    signedPayload(sodium, ciphertexts),
    myIdentity.identity.privateKey,
  );
  const selfCiphertext = sodium.crypto_box_seal(message, myIdentity.signedPreKey.keyPair.publicKey);

  return {
    ciphertext: ciphertexts[0],
    ciphertexts,
    signature: toB64(sodium, signature),
    senderIdentityKey: toB64(sodium, myIdentity.identity.publicKey),
    selfCiphertext: toB64(sodium, selfCiphertext),
  };
}

/**
 * True when this envelope was written by the identity we hold — i.e. it is
 * our own sent message coming back from the server, and `selfCiphertext` is
 * the copy we can actually open.
 */
export function isOwnEnvelope(sodium: SodiumLike, envelope: Envelope, myIdentity: LocalIdentity): boolean {
  return envelope.senderIdentityKey === toB64(sodium, myIdentity.identity.publicKey);
}

export function decryptFromSender(sodium: SodiumLike, envelope: Envelope, myIdentity: LocalIdentity): string {
  const senderIdentityPublic = fromB64(sodium, envelope.senderIdentityKey);
  const ciphertexts = envelope.ciphertexts ?? [envelope.ciphertext];

  // Verify before opening: a sealed box is anonymous, so an unverified
  // envelope proves nothing about who wrote it. Single-copy envelopes were
  // signed over the raw bytes; multi-copy ones over the joined list.
  const signature = fromB64(sodium, envelope.signature);
  const valid = envelope.ciphertexts
    ? sodium.crypto_sign_verify_detached(signature, signedPayload(sodium, ciphertexts), senderIdentityPublic)
    : sodium.crypto_sign_verify_detached(signature, fromB64(sodium, envelope.ciphertext), senderIdentityPublic);
  if (!valid) {
    throw new Error("Message signature verification failed — refusing to decrypt an unauthenticated envelope");
  }

  // Our own message: `ciphertext` is sealed to the recipient and is not ours
  // to open, so read the self-copy instead.
  const own = isOwnEnvelope(sodium, envelope, myIdentity);
  if (own && !envelope.selfCiphertext) {
    throw undecryptable("Own message predates self-copy support — plaintext is not recoverable");
  }

  // Sealed boxes carry no recipient hint, so there's nothing to match on —
  // try each copy until one opens with our prekey.
  const candidates = own ? [envelope.selfCiphertext!] : ciphertexts;
  for (const candidate of candidates) {
    try {
      const plaintext = sodium.crypto_box_seal_open(
        fromB64(sodium, candidate),
        myIdentity.signedPreKey.keyPair.publicKey,
        myIdentity.signedPreKey.keyPair.privateKey,
      );
      return sodium.to_string(plaintext);
    } catch {
      // Not addressed to this device — try the next copy.
    }
  }

  // None matched: the sender didn't know about this device when it encrypted
  // (registered later, or the sender used a cached bundle list).
  throw undecryptable("No copy of this message was sealed to this device's key");
}

/**
 * Marks a decryption failure as *expected* — a message this device was never
 * able to read, rather than a bug. Callers use the flag to decide whether to
 * make noise; the UI shows the same lock placeholder either way.
 */
export interface UndecryptableError extends Error {
  expected: true;
}

export function isUndecryptable(err: unknown): err is UndecryptableError {
  return typeof err === "object" && err !== null && (err as { expected?: unknown }).expected === true;
}

function undecryptable(message: string): UndecryptableError {
  return Object.assign(new Error(message), { expected: true as const });
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
