// Native-only barrel (./ble and ./wifiDirect have no .web variants) —
// importing THIS from shared code that also runs on web is a build error by
// design; see types.ts.
//
// Cross-platform callers want "@shared/p2p/localCall" and "@shared/p2p/types"
// instead: localCall has a .web variant that reports the transport as
// unavailable, so callStore can import it unconditionally.
export * from "./types";
export * from "./localCall";
export { bleMeshTransport } from "./ble";
export { wifiDirectTransport } from "./wifiDirect";
export { startLocalSignalingServer, connectLocalSignaling, type LocalSignalingChannel } from "./localSignaling";
