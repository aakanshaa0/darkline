// NOTE: unverified in this environment — react-native-webrtc ships native
// iOS/Android code that needs a real build (and camera/mic permissions on
// a real device or emulator) to actually exercise; none of that is
// available here. Its JS API is intentionally modeled on the browser
// WebRTC API, which is why this mirrors webrtc.web.ts closely.
import { RTCPeerConnection, mediaDevices } from "react-native-webrtc";
import type { WebRTCAdapter, RTCPeerConnectionLike, MediaStreamLike, RTCIceServer } from "./types";

function wrapPeerConnection(pc: RTCPeerConnection): RTCPeerConnectionLike {
  return {
    addTrack: (track, stream) => pc.addTrack(track as never, stream as never),
    createOffer: () => pc.createOffer().then((d: RTCSessionDescriptionInit) => ({ sdp: d.sdp ?? "", type: d.type })),
    createAnswer: () => pc.createAnswer().then((d: RTCSessionDescriptionInit) => ({ sdp: d.sdp ?? "", type: d.type })),
    setLocalDescription: (desc) => pc.setLocalDescription(desc as never),
    setRemoteDescription: (desc) => pc.setRemoteDescription(desc as never),
    addIceCandidate: (candidate) => pc.addIceCandidate(candidate as never),
    close: () => pc.close(),
    onIceCandidate: (cb) => {
      // @ts-expect-error react-native-webrtc's event typings lag the DOM lib this file otherwise targets
      pc.onicecandidate = (e) => {
        if (e.candidate) cb(e.candidate.toJSON());
      };
    },
    onTrack: (cb) => {
      // @ts-expect-error same as above
      pc.ontrack = (e) => cb(e.streams[0] as unknown as MediaStreamLike);
    },
    onConnectionStateChange: (cb) => {
      pc.onconnectionstatechange = () => cb(pc.connectionState);
    },
  };
}

export const webrtcAdapter: WebRTCAdapter = {
  createPeerConnection: (config: { iceServers: RTCIceServer[] }) =>
    wrapPeerConnection(new RTCPeerConnection({ iceServers: config.iceServers })),
  getUserMedia: (constraints) => mediaDevices.getUserMedia(constraints) as unknown as Promise<MediaStreamLike>,
  stopStream: (stream) => stream.getTracks().forEach((t) => t.stop()),
};
