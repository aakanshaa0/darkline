import { Q } from "@nozbe/watermelondb";
import { database } from "./database";
import { LocalMessage } from "./models/LocalMessage";
import { connectivityWatcher } from "@shared/connectivity";

/**
 * Part D.4: "WatermelonDB write (status: pending) → local UI updates
 * immediately → sync manager watches NetInfo → on reconnect, pending
 * messages POST to the API → server assigns canonical ID/timestamp →
 * client reconciles." This is a small custom sync loop against the
 * backend's POST /messages/sync bulk endpoint — not WatermelonDB's own
 * built-in `synchronize()` protocol, which expects a pull/push-changes
 * server contract this backend doesn't implement.
 */

export interface PendingMessagePayload {
  conversationId: string;
  localId: string;
  ciphertext: string;
  transportMode: "internet" | "local" | "ble";
}

export interface SyncResult {
  localId: string;
  id: string;
  createdAt: string;
}

export async function queueOutgoingMessage(input: {
  conversationRowId: string;
  localId: string;
  senderId: string;
  ciphertext: string;
  transportMode: "internet" | "local" | "ble";
}): Promise<void> {
  const collection = database.get<LocalMessage>("local_messages");
  await database.write(async () => {
    await collection.create((m) => {
      m.conversationId = input.conversationRowId;
      m.localId = input.localId;
      m.senderId = input.senderId;
      m.ciphertext = input.ciphertext;
      m.transportMode = input.transportMode;
      m.status = "pending";
      m.createdAt = Date.now();
    });
  });
}

async function getPendingMessages(): Promise<LocalMessage[]> {
  const collection = database.get<LocalMessage>("local_messages");
  return collection.query(Q.where("status", "pending")).fetch();
}

async function markSynced(pending: LocalMessage[], results: SyncResult[]): Promise<void> {
  const byLocalId = new Map(results.map((r) => [r.localId, r]));
  await database.write(async () => {
    for (const message of pending) {
      const result = byLocalId.get(message.localId);
      if (!result) continue;
      await message.update((m) => {
        m.serverId = result.id;
        m.status = "sent";
      });
    }
  });
}

/**
 * Call once at app startup. `syncFn` is the actual HTTP call (POST
 * /messages/sync) — injected rather than imported directly so this module
 * doesn't need a hard dependency on shared/api (avoids a circular import,
 * since shared/api will in turn want to call queueOutgoingMessage above).
 */
export function startSyncManager(syncFn: (pending: PendingMessagePayload[]) => Promise<SyncResult[]>): () => void {
  let syncing = false;

  async function flush() {
    if (syncing) return;
    const pending = await getPendingMessages();
    if (pending.length === 0) return;

    syncing = true;
    try {
      const results = await syncFn(
        pending.map((m) => ({
          conversationId: m.conversationId,
          localId: m.localId,
          ciphertext: m.ciphertext,
          transportMode: m.transportMode,
        })),
      );
      await markSynced(pending, results);
    } catch {
      // Left as "pending" — next connectivity change or app start retries. No backoff/retry-limit yet.
    } finally {
      syncing = false;
    }
  }

  return connectivityWatcher.subscribe((info) => {
    if (info.hasInternet) flush();
  });
}
