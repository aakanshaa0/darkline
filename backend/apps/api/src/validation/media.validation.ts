import { z } from "zod";

export const requestUploadSchema = z.object({
  mimeType: z.string().min(1),
  sizeBytes: z.number().nonnegative().optional(),
});
