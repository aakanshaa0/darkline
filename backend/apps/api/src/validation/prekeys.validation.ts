import { z } from "zod";

export const uploadPrekeysSchema = z.object({
  identityKey: z.string().min(1),
  signedPreKey: z.object({
    keyId: z.number().int(),
    publicKey: z.string().min(1),
    signature: z.string().min(1),
  }),
  oneTimePreKeys: z.array(z.object({ keyId: z.number().int(), publicKey: z.string().min(1) })).default([]),
});
