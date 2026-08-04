import jwt from "jsonwebtoken";
import { env } from "@darkline/config";

// Verify-only, deliberately duplicated from apps/api/src/lib/jwt.ts rather
// than imported cross-app — apps/* are independent deployables (see
// docs/setup/backend-setup.md), not meant to import each other's source;
// shared logic belongs in packages/*. This only needs to verify tokens
// signed by the api service using the same JWT_SECRET from @darkline/config.
export interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}
