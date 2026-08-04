/**
 * Browsers gate getUserMedia behind their own permission prompt, raised by
 * the call itself — there is nothing to request up front.
 */
export async function ensureCallPermissions(_kind: "audio" | "video"): Promise<boolean> {
  return true;
}
