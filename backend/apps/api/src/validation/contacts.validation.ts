import { z } from "zod";

export const createContactSchema = z.object({
  contactUserId: z.string().min(1),
  source: z.enum(["search", "nearby-wifi", "nearby-ble", "qr"]),
});
