import type { Request, Response } from "express";
import { PrekeyBundleModel } from "@darkline/db";
import { HttpError } from "../lib/HttpError";
import type { uploadPrekeysSchema } from "../validation/prekeys.validation";
import type { z } from "zod";

// ── POST /keys/prekeys — X3DH bootstrap upload ───────────────────────────
export async function uploadPrekeys(req: Request, res: Response) {
  const { identityKey, signedPreKey, oneTimePreKeys } = req.body as z.infer<typeof uploadPrekeysSchema>;

  const existing = await PrekeyBundleModel.findOne({ userId: req.userId });
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

// ── GET /keys/prekeys/:userId — fetch a bundle to start an X3DH session ─
export async function getPrekeyBundle(req: Request, res: Response) {
  const bundle = await PrekeyBundleModel.findOne({ userId: req.params.userId });
  if (!bundle) throw new HttpError(404, "No prekey bundle for this user", "NO_PREKEYS");

  // One-time prekeys are consumed on use (X3DH): claim the first unused one.
  const unused = bundle.oneTimePreKeys.find((k) => !k.used);
  if (unused) {
    await PrekeyBundleModel.updateOne(
      { userId: req.params.userId, "oneTimePreKeys.keyId": unused.keyId },
      { $set: { "oneTimePreKeys.$.used": true } },
    );
  }

  res.json({
    identityKey: bundle.identityKey,
    signedPreKey: bundle.signedPreKey,
    oneTimePreKey: unused ? { keyId: unused.keyId, publicKey: unused.publicKey } : null,
  });
}
