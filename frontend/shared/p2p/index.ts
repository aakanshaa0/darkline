// Native-only module (no .web.ts variants) — importing this from web code
// is a build error by design; see types.ts.
export * from "./types";
export { bleMeshTransport } from "./ble";
export { wifiDirectTransport } from "./wifiDirect";
export { startLocalSignalingServer, connectLocalSignaling, type LocalSignalingChannel } from "./localSignaling";
