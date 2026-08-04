import type { Request, Response } from "express";
import { generateMediaId, getUploadUrl, getDownloadUrl } from "../lib/s3";
import type { requestUploadSchema } from "../validation/media.validation";
import type { z } from "zod";

// ── POST /media/upload ───────────────────────────────────────────────────
export async function requestUpload(req: Request, res: Response) {
  const { mimeType } = req.body as z.infer<typeof requestUploadSchema>;
  const mediaId = generateMediaId();
  const { uploadUrl } = await getUploadUrl(mediaId, mimeType);
  res.status(201).json({ mediaId, uploadUrl });
}

// ── GET /media/:id ────────────────────────────────────────────────────────
export async function getMedia(req: Request, res: Response) {
  const downloadUrl = await getDownloadUrl(req.params.id);
  res.json({ downloadUrl });
}
