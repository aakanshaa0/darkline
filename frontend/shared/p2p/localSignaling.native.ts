// NOTE: unverified in this environment — same caveat as wifiDirect.native.ts.
// This is the piece Part B.3.B describes as "SDP/ICE exchange happens over
// a plain local TCP socket directly between devices — no server involved":
// once WiFi Direct forms a group, the group owner's address is reachable
// over the local link, and this opens a plain TCP socket to it instead of
// going through ws-signaling.
import TcpSocket from "react-native-tcp-socket";

type Socket = ReturnType<typeof TcpSocket.createConnection>;
type Server = ReturnType<typeof TcpSocket.createServer>;

const LOCAL_SIGNALING_PORT = 57341;

export interface LocalSignalingChannel {
  send(message: Record<string, unknown>): void;
  onMessage(cb: (message: Record<string, unknown>) => void): void;
  close(): void;
}

function wrapSocket(socket: Socket): LocalSignalingChannel {
  let listener: ((message: Record<string, unknown>) => void) | null = null;
  let buffer = "";

  socket.on("data", (data: string | Buffer) => {
    buffer += data.toString();
    let newlineIndex: number;
    // Newline-delimited JSON framing — simple and sufficient for SDP/ICE-sized payloads.
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line) listener?.(JSON.parse(line));
    }
  });

  return {
    send: (message) => socket.write(JSON.stringify(message) + "\n"),
    onMessage: (cb) => {
      listener = cb;
    },
    close: () => socket.destroy(),
  };
}

/** Group owner side — listens for the other device to connect. */
export function startLocalSignalingServer(): Promise<LocalSignalingChannel> {
  return new Promise((resolve, reject) => {
    const server: Server = TcpSocket.createServer((socket) => {
      resolve(wrapSocket(socket));
    });
    server.listen({ port: LOCAL_SIGNALING_PORT, host: "0.0.0.0" });
    server.on("error", reject);
  });
}

/** Non-owner side — connects to the group owner's address once WiFi Direct reports it. */
export function connectLocalSignaling(groupOwnerAddress: string): Promise<LocalSignalingChannel> {
  return new Promise((resolve, reject) => {
    const socket = TcpSocket.createConnection(
      { port: LOCAL_SIGNALING_PORT, host: groupOwnerAddress },
      () => resolve(wrapSocket(socket)),
    );
    socket.on("error", reject);
  });
}
