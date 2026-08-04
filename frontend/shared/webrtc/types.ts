/**
 * Platform-agnostic surface both webrtc.native.ts (react-native-webrtc)
 * and webrtc.web.ts (browser RTCPeerConnection) implement — callers
 * (call screens, ws-signaling socket wiring) never import either
 * directly. See shared/crypto for the same native/web split pattern.
 */
export interface WebRTCAdapter {
  createPeerConnection(config: { iceServers: RTCIceServer[] }): RTCPeerConnectionLike;
  getUserMedia(constraints: { audio: boolean; video: boolean }): Promise<MediaStreamLike>;
  stopStream(stream: MediaStreamLike): void;
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface MediaStreamLike {
  id: string;
  getTracks(): Array<{ stop(): void }>;
}

export interface RTCPeerConnectionLike {
  addTrack(track: unknown, stream: MediaStreamLike): void;
  createOffer(): Promise<{ sdp: string; type: string }>;
  createAnswer(): Promise<{ sdp: string; type: string }>;
  setLocalDescription(desc: { sdp: string; type: string }): Promise<void>;
  setRemoteDescription(desc: { sdp: string; type: string }): Promise<void>;
  addIceCandidate(candidate: unknown): Promise<void>;
  close(): void;
  onIceCandidate(cb: (candidate: unknown) => void): void;
  onTrack(cb: (stream: MediaStreamLike) => void): void;
  onConnectionStateChange(cb: (state: string) => void): void;
}
