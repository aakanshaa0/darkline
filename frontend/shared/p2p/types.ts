/**
 * Offline transport layer (Part B.2/B.3.C). Native-only — no .web.ts
 * variant exists here on purpose, matching Part E.2: "web disables
 * local/offline mode entirely." Single-hop only, per Part G.5: "ship
 * reliable single-hop first; general mesh routing is a genuinely hard
 * research problem" — deliberately not attempting multi-hop relay.
 */

export interface BlePeer {
  id: string; // BLE device id (ble-plx), not a Darkline userId — identity is established after connecting, via the app-level handshake
  name: string | null;
  rssi: number | null;
}

export interface BleMeshTransport {
  startScanning(onPeerFound: (peer: BlePeer) => void): void;
  stopScanning(): void;
  /** Sends a (already E2EE-encrypted) payload to a peer discovered via scanning. Chunked internally — BLE writes are MTU-limited. */
  sendToPeer(peerId: string, payload: string): Promise<void>;
  onMessageReceived(cb: (fromPeerId: string, payload: string) => void): void;
  destroy(): void;
}

export interface WifiDirectPeer {
  deviceAddress: string;
  deviceName: string;
}

export interface WifiDirectConnectionInfo {
  groupOwnerAddress: string | null;
  isGroupOwner: boolean;
  isConnected: boolean;
}

export interface WifiDirectTransport {
  initialize(): Promise<void>;
  discoverPeers(onPeersChanged: (peers: WifiDirectPeer[]) => void): Promise<void>;
  stopDiscovery(): Promise<void>;
  connectToPeer(deviceAddress: string): Promise<void>;
  getConnectionInfo(): Promise<WifiDirectConnectionInfo>;
  disconnect(): Promise<void>;
}
