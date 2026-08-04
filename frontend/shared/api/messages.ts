import { apiRequest } from "./httpClient";
import type { PendingMessagePayload, SyncResult } from "@shared/db";

export const syncMessages = (messages: PendingMessagePayload[]) =>
  apiRequest<{ synced: SyncResult[] }>("/messages/sync", { method: "POST", body: { messages } }).then(
    (r) => r.synced,
  );

export const editMessage = (id: string, input: { ciphertext?: string; delete?: boolean }) =>
  apiRequest<{ message: unknown }>(`/messages/${id}`, { method: "PATCH", body: input });
