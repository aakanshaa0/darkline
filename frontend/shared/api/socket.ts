import { io, type Socket } from "socket.io-client";
import { WS_SIGNALING_URL } from "./config";
import { loadTokens } from "./tokenStore";

let socket: Socket | null = null;

/** Connects to ws-signaling (Part D.3) using the stored access token — must be called after a successful login/signup. */
export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const tokens = await loadTokens();
  if (!tokens) throw new Error("Not authenticated — call connectSocket() only after login");

  socket = io(WS_SIGNALING_URL, {
    auth: { token: tokens.accessToken },
    transports: ["websocket"],
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
