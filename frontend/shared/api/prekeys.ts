import { apiRequest } from "./httpClient";
import type { FetchedPrekeyBundleDto } from "./types";
import type { UploadablePrekeyBundle } from "@shared/crypto";

export const uploadPrekeys = (bundle: UploadablePrekeyBundle) =>
  apiRequest<{ bundle: unknown }>("/keys/prekeys", { method: "POST", body: bundle });

export const getPrekeyBundle = (userId: string) => apiRequest<FetchedPrekeyBundleDto>(`/keys/prekeys/${userId}`);
