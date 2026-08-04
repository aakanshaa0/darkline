// NOTE: unverified in this environment — Android emulators have no WiFi
// Direct radio, so nothing below this line has been exercised against real
// hardware. Needs two physical Android devices on the same WiFi Direct group.
//
// Part B.3.B: "SDP/ICE exchange happens over a plain local TCP socket
// directly between devices — no server involved". This is the piece that
// joins wifiDirect.native.ts (forming the group) to localSignaling.native.ts
// (the TCP link) and presents the result as a CallSignaling that callStore
// can use interchangeably with the internet socket.

import { wifiDirectTransport } from "./wifiDirect";
import { startLocalSignalingServer, connectLocalSignaling, type LocalSignalingChannel } from "./localSignaling";
import type { CallSignaling, WifiDirectPeer } from "./types";

/**
 * Wraps the newline-JSON channel in socket.io-style event dispatch. Messages
 * on the wire are `{ event, payload }` — the same event names the internet
 * path uses, so callStore's handlers are identical either way.
 */
function toCallSignaling(channel: LocalSignalingChannel): CallSignaling {
  const handlers = new Map<string, Array<(payload: never) => void>>();
  const onceHandlers = new Map<string, Array<(payload: never) => void>>();

  channel.onMessage((message) => {
    const event = message.event as string | undefined;
    if (!event) return;
    const payload = (message.payload ?? {}) as never;

    handlers.get(event)?.forEach((cb) => cb(payload));

    const onces = onceHandlers.get(event);
    if (onces) {
      onceHandlers.delete(event);
      onces.forEach((cb) => cb(payload));
    }
  });

  return {
    mode: "local",
    emit: (event, payload) => channel.send({ event, payload }),
    on: (event, cb) => {
      handlers.set(event, [...(handlers.get(event) ?? []), cb]);
    },
    once: (event, cb) => {
      onceHandlers.set(event, [...(onceHandlers.get(event) ?? []), cb]);
    },
    close: () => channel.close(),
  };
}

export const isLocalTransportAvailable = true;

export async function initLocalTransport(): Promise<void> {
  await wifiDirectTransport.initialize();
}

export function discoverLocalPeers(onPeersChanged: (peers: WifiDirectPeer[]) => void): Promise<void> {
  return wifiDirectTransport.discoverPeers(onPeersChanged);
}

export function stopDiscoveringLocalPeers(): Promise<void> {
  return wifiDirectTransport.stopDiscovery();
}

/**
 * Polls until WiFi Direct reports the group is up. `connectToPeer` resolves
 * when the invitation is accepted, but group-owner negotiation and the
 * owner's IP are only reported by a later broadcast, so the address isn't
 * available synchronously.
 */
async function awaitGroupFormation(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const info = await wifiDirectTransport.getConnectionInfo();
    if (info.isConnected && (info.isGroupOwner || info.groupOwnerAddress)) return info;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("WiFi Direct group did not form in time");
}

/**
 * Forms a group with `deviceAddress` and opens the signaling link. Which side
 * listens is decided by WiFi Direct's own group-owner election, not by who
 * initiated — either device can end up the owner.
 */
export async function openLocalCallSignaling(deviceAddress: string): Promise<CallSignaling> {
  await wifiDirectTransport.connectToPeer(deviceAddress);
  const info = await awaitGroupFormation();

  const channel = info.isGroupOwner
    ? await startLocalSignalingServer()
    : await connectLocalSignaling(info.groupOwnerAddress!);

  return toCallSignaling(channel);
}

/**
 * Accepting side when the group already exists (the peer initiated). Same
 * owner/non-owner split, no connectToPeer — the group is already formed.
 */
export async function acceptLocalCallSignaling(): Promise<CallSignaling> {
  const info = await awaitGroupFormation();
  const channel = info.isGroupOwner
    ? await startLocalSignalingServer()
    : await connectLocalSignaling(info.groupOwnerAddress!);
  return toCallSignaling(channel);
}

export async function closeLocalTransport(): Promise<void> {
  await wifiDirectTransport.disconnect();
}
