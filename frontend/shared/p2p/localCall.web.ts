// Web disables local/offline mode entirely (Part E.2) — browsers have no
// WiFi Direct and no raw TCP. These exist so shared code can import
// @shared/p2p unconditionally without a Platform check at every call site;
// the store guards on `isLocalTransportAvailable` before ever reaching them.

import type { CallSignaling, WifiDirectPeer } from "./types";

export const LOCAL_TRANSPORT_UNAVAILABLE = "Offline WiFi transport is not available on web";

export const isLocalTransportAvailable = false;

export async function initLocalTransport(): Promise<void> {
  throw new Error(LOCAL_TRANSPORT_UNAVAILABLE);
}

export async function discoverLocalPeers(_onPeersChanged: (peers: WifiDirectPeer[]) => void): Promise<void> {
  throw new Error(LOCAL_TRANSPORT_UNAVAILABLE);
}

export async function stopDiscoveringLocalPeers(): Promise<void> {
  // No-op: nothing was ever started.
}

export async function openLocalCallSignaling(_deviceAddress: string): Promise<CallSignaling> {
  throw new Error(LOCAL_TRANSPORT_UNAVAILABLE);
}

export async function acceptLocalCallSignaling(): Promise<CallSignaling> {
  throw new Error(LOCAL_TRANSPORT_UNAVAILABLE);
}

export async function closeLocalTransport(): Promise<void> {
  // No-op.
}
