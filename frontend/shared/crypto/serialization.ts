import type { SodiumLike } from "./types";
import type { LocalIdentity } from "./e2eeCore";

/** JSON-safe (base64-string) form of LocalIdentity, for keyStore persistence. */
export interface SerializedIdentity {
  identity: { publicKey: string; privateKey: string };
  signedPreKey: { keyId: number; keyPair: { publicKey: string; privateKey: string } };
  signedPreKeySignature: string;
  oneTimePreKeys: Array<{ keyId: number; keyPair: { publicKey: string; privateKey: string } }>;
}

export function serializeIdentity(sodium: SodiumLike, local: LocalIdentity): SerializedIdentity {
  const b64 = (bytes: Uint8Array) => sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
  return {
    identity: { publicKey: b64(local.identity.publicKey), privateKey: b64(local.identity.privateKey) },
    signedPreKey: {
      keyId: local.signedPreKey.keyId,
      keyPair: {
        publicKey: b64(local.signedPreKey.keyPair.publicKey),
        privateKey: b64(local.signedPreKey.keyPair.privateKey),
      },
    },
    signedPreKeySignature: b64(local.signedPreKeySignature),
    oneTimePreKeys: local.oneTimePreKeys.map((k) => ({
      keyId: k.keyId,
      keyPair: { publicKey: b64(k.keyPair.publicKey), privateKey: b64(k.keyPair.privateKey) },
    })),
  };
}

export function deserializeIdentity(sodium: SodiumLike, data: SerializedIdentity): LocalIdentity {
  const raw = (s: string) => sodium.from_base64(s, sodium.base64_variants.ORIGINAL);
  return {
    identity: { publicKey: raw(data.identity.publicKey), privateKey: raw(data.identity.privateKey) },
    signedPreKey: {
      keyId: data.signedPreKey.keyId,
      keyPair: {
        publicKey: raw(data.signedPreKey.keyPair.publicKey),
        privateKey: raw(data.signedPreKey.keyPair.privateKey),
      },
    },
    signedPreKeySignature: raw(data.signedPreKeySignature),
    oneTimePreKeys: data.oneTimePreKeys.map((k) => ({
      keyId: k.keyId,
      keyPair: { publicKey: raw(k.keyPair.publicKey), privateKey: raw(k.keyPair.privateKey) },
    })),
  };
}
