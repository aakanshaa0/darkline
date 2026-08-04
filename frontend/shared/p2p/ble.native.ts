// NOTE: unverified in this environment — no BLE hardware/emulator support
// here, and this needs a real native build besides. Implements the
// CENTRAL role only (scan for and connect to other devices, read/write
// their GATT characteristics) — react-native-ble-plx is a central-role
// library. For two phones to actually find each other, at least one side
// also needs to run as a BLE PERIPHERAL (advertise this custom service so
// the other side's scan can see it), which needs a second native module
// (e.g. react-native-ble-peripheral) not added in this pass — that's the
// real remaining gap, called out rather than silently glossed over.
import { BleManager, type Device, type Characteristic } from "react-native-ble-plx";
import { Buffer } from "buffer";
import type { BleMeshTransport, BlePeer } from "./types";

// Placeholder UUIDs — real ones should be generated once and hard-coded
// (they identify "this is a Darkline mesh peer" during scanning).
const MESH_SERVICE_UUID = "8f6e8b20-8c1e-4b3f-9e0e-000000000001";
const MESH_CHARACTERISTIC_UUID = "8f6e8b20-8c1e-4b3f-9e0e-000000000002";

const CHUNK_SIZE = 180; // stay under common BLE ATT MTU (~185 usable bytes) without negotiating a larger MTU

class BleMesh implements BleMeshTransport {
  private manager = new BleManager();
  private connectedDevices = new Map<string, Device>();
  private messageListener: ((fromPeerId: string, payload: string) => void) | null = null;
  private inboundBuffers = new Map<string, string[]>();

  startScanning(onPeerFound: (peer: BlePeer) => void): void {
    this.manager.startDeviceScan([MESH_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
      if (error || !device) return;
      onPeerFound({ id: device.id, name: device.name, rssi: device.rssi });
    });
  }

  stopScanning(): void {
    this.manager.stopDeviceScan();
  }

  async sendToPeer(peerId: string, payload: string): Promise<void> {
    let device = this.connectedDevices.get(peerId);
    if (!device) {
      device = await this.manager.connectToDevice(peerId);
      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevices.set(peerId, device);
      this.subscribeToDevice(device);
    }

    const chunks = chunkString(payload, CHUNK_SIZE);
    for (let i = 0; i < chunks.length; i++) {
      // Prefix each chunk so the receiver can reassemble: "<index>/<total>:<data>"
      const framed = `${i}/${chunks.length}:${chunks[i]}`;
      const base64 = Buffer.from(framed, "utf8").toString("base64");
      await this.manager.writeCharacteristicWithResponseForDevice(
        device.id,
        MESH_SERVICE_UUID,
        MESH_CHARACTERISTIC_UUID,
        base64,
      );
    }
  }

  onMessageReceived(cb: (fromPeerId: string, payload: string) => void): void {
    this.messageListener = cb;
  }

  destroy(): void {
    this.manager.stopDeviceScan();
    this.connectedDevices.forEach((d) => this.manager.cancelDeviceConnection(d.id).catch(() => undefined));
    this.connectedDevices.clear();
    this.manager.destroy();
  }

  private subscribeToDevice(device: Device): void {
    device.monitorCharacteristicForService(MESH_SERVICE_UUID, MESH_CHARACTERISTIC_UUID, (error, characteristic) => {
      if (error || !characteristic?.value) return;
      this.handleChunk(device.id, characteristic);
    });
  }

  private handleChunk(peerId: string, characteristic: Characteristic): void {
    const framed = Buffer.from(characteristic.value!, "base64").toString("utf8");
    const separatorIndex = framed.indexOf(":");
    const [indexStr, totalStr] = framed.slice(0, separatorIndex).split("/");
    const data = framed.slice(separatorIndex + 1);

    const index = Number(indexStr);
    const total = Number(totalStr);
    const buffer = this.inboundBuffers.get(peerId) ?? new Array(total).fill(undefined);
    buffer[index] = data;
    this.inboundBuffers.set(peerId, buffer);

    if (buffer.every((c) => c !== undefined)) {
      this.inboundBuffers.delete(peerId);
      this.messageListener?.(peerId, buffer.join(""));
    }
  }
}

function chunkString(input: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < input.length; i += size) chunks.push(input.slice(i, i + size));
  return chunks;
}

export const bleMeshTransport: BleMeshTransport = new BleMesh();
