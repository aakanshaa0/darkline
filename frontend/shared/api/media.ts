import { apiRequest } from "./httpClient";

export const requestUpload = (input: { mimeType: string; sizeBytes?: number }) =>
  apiRequest<{ mediaId: string; uploadUrl: string }>("/media/upload", { method: "POST", body: input });

export const getMediaDownloadUrl = (mediaId: string) =>
  apiRequest<{ downloadUrl: string }>(`/media/${mediaId}`);
