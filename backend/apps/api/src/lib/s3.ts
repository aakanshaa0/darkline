import crypto from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@darkline/config";
import { HttpError } from "./HttpError";

function requireConfigured() {
  if (!env.AWS_S3_BUCKET || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new HttpError(500, "Media storage is not configured", "S3_NOT_CONFIGURED");
  }
}

function client(): S3Client {
  return new S3Client({
    region: env.AWS_REGION,
    credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID!, secretAccessKey: env.AWS_SECRET_ACCESS_KEY! },
  });
}

/**
 * There's no separate Media collection in packages/db — attachments are
 * embedded directly on Message.attachments (Part B.5) — so the S3 key is
 * derived deterministically from mediaId alone (not scoped to the
 * uploader) so GET /media/:id can reconstruct it without a lookup, and so
 * a *recipient* in a different conversation can fetch an attachment
 * someone else uploaded. Access control today is "you must know the
 * mediaId," which only conversation participants see via the message
 * itself — narrower auth (verifying the requester is actually a
 * participant in the message that references this mediaId) needs a real
 * Media collection and is a reasonable next hardening step, not done here.
 */
function keyFor(mediaId: string): string {
  return `media/${mediaId}`;
}

export function generateMediaId(): string {
  return crypto.randomUUID();
}

export async function getUploadUrl(mediaId: string, mimeType: string): Promise<{ uploadUrl: string; key: string }> {
  requireConfigured();
  const key = keyFor(mediaId);
  const command = new PutObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key, ContentType: mimeType });
  const uploadUrl = await getSignedUrl(client(), command, { expiresIn: 900 });
  return { uploadUrl, key };
}

export async function getDownloadUrl(mediaId: string): Promise<string> {
  requireConfigured();
  const key = keyFor(mediaId);
  const command = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key });
  return getSignedUrl(client(), command, { expiresIn: 900 });
}
