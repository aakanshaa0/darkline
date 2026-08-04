// NOTE: unverified in this environment — react-native-wifi-p2p wraps
// Android's WiFi P2P (WiFi Direct) APIs; there's no iOS equivalent (per
// Part B.2, iOS local mode goes through a custom Multipeer Connectivity
// bridge instead — not built in this pass, it needs real native
// Swift/ObjC module code, a materially bigger undertaking than wrapping
// an existing npm package). Needs a real Android device/emulator to
// exercise any of this.
import WifiP2P from "react-native-wifi-p2p";
import type { WifiDirectTransport, WifiDirectPeer, WifiDirectConnectionInfo } from "./types";

export const wifiDirectTransport: WifiDirectTransport = {
  async initialize() {
    await WifiP2P.initialize();
  },

  async discoverPeers(onPeersChanged) {
    WifiP2P.subscribeOnPeersUpdates(({ devices }: { devices: Array<{ deviceAddress: string; deviceName: string }> }) => {
      onPeersChanged(devices.map((d) => ({ deviceAddress: d.deviceAddress, deviceName: d.deviceName })));
    });
    await WifiP2P.startDiscoveringPeers();
  },

  async stopDiscovery() {
    await WifiP2P.stopDiscoveringPeers();
  },

  async connectToPeer(deviceAddress: string) {
    await WifiP2P.connect(deviceAddress);
  },

  async getConnectionInfo(): Promise<WifiDirectConnectionInfo> {
    const info = await WifiP2P.getConnectionInfo();
    return {
      groupOwnerAddress: info.groupOwnerAddress?.hostAddress ?? null,
      isGroupOwner: !!info.isGroupOwner,
      isConnected: !!info.groupFormed,
    };
  },

  async disconnect() {
    await WifiP2P.removeGroup();
  },
};
