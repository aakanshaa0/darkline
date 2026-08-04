// Canonical definition — shared/store re-exports this rather than the
// other way around, so this module (and everything it's built on, like
// shared/db's sync manager) never has to import the store and risk a
// store → api → db → connectivity → store cycle.
export type Presence = "online" | "wifi" | "ble" | "offline";

export interface ConnectivityInfo {
  /** Best status to report via the socket.io `presence:update` event — see ws-signaling's handlers.ts comment on why the server can't infer this itself. */
  status: Presence;
  hasInternet: boolean;
}

export type ConnectivityListener = (info: ConnectivityInfo) => void;

export interface ConnectivityWatcher {
  subscribe(listener: ConnectivityListener): () => void;
}
