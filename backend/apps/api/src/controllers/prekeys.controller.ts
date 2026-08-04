import type { Request, Response } from "express";
import { PrekeyBundleModel } from "@darkline/db";
import { HttpError } from "../lib/HttpError";
import type { uploadPrekeysSchema } from "../validation/prekeys.validation";
import type { z } from "zod";

// ── POST /keys/prekeys — X3DH bootstrap upload ───────────────────────────
export async function uploadPrekeys(req: Request, res: Response) {
  const { identityKey, signedPreKey, oneTimePreKeys } = req.body as z.infer<typeof uploadPrekeysSchema>;

  // Scoped by identityKey: a second device registers its own bundle instead
  // of replacing the first device's.
  const existing = await PrekeyBundleModel.findOne({ userId: req.userId, identityKey });
  if (!existing) {
    const bundle = await PrekeyBundleModel.create({
      userId: req.userId,
      identityKey,
      signedPreKey,
      oneTimePreKeys: oneTimePreKeys.map((k) => ({ ...k, used: false })),
    });
    return res.status(201).json({ bundle });
  }

  existing.identityKey = identityKey;
  existing.signedPreKey = signedPreKey;
  const existingKeyIds = new Set(existing.oneTimePreKeys.map((k) => k.keyId));
  for (const k of oneTimePreKeys) {
    if (!existingKeyIds.has(k.keyId)) {
      existing.oneTimePreKeys.push({ ...k, used: false });
    }
  }
  await existing.save();
  res.json({ bundle: existing });
}

// ── GET /keys/prekeys/:userId — every device's bundle for this user ──────
/**
 * Returns ALL of the user's device bundles. The sender encrypts a copy per
 * bundle so the message is readable on every device the recipient has
 * registered — returning just one meant only the most recently published
 * device could read anything.
 *
 * `bundles` is the array; `identityKey`/`signedPreKey`/`oneTimePreKey` are
 * kept alongside it, mirroring the first entry, so an older client that
 * expects a single bundle keeps working.
 */
export async function getPrekeyBundle(req: Request, res: Response) {
  const bundles = await PrekeyBundleModel.find({ userId: req.params.userId }).sort({ updatedAt: -1 });
  if (bundles.length === 0) throw new HttpError(404, "No prekey bundle for this user", "NO_PREKEYS");

  const serialized = await Promise.all(
    bundles.map(async (bundle) => {
      // One-time prekeys are consumed on use (X3DH): claim the first unused
      // one from each device's own pool.
      const unused = bundle.oneTimePreKeys.find((k) => !k.used);
      if (unused) {
        await PrekeyBundleModel.updateOne(
          { _id: bundle._id, "oneTimePreKeys.keyId": unused.keyId },
          { $set: { "oneTimePreKeys.$.used": true } },
        );
      }
      return {
        identityKey: bundle.identityKey,
        signedPreKey: bundle.signedPreKey,
        oneTimePreKey: unused ? { keyId: unused.keyId, publicKey: unused.publicKey } : null,
      };
    }),
  );

  res.json({ bundles: serialized, ...serialized[0] });
}
