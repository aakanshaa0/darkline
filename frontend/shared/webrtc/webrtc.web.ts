import type { WebRTCAdapter, RTCPeerConnectionLike, MediaStreamLike, RTCIceServer } from "./types";

function wrapPeerConnection(pc: RTCPeerConnection): RTCPeerConnectionLike {
  return {
    addTrack: (track, stream) => pc.addTrack(track as MediaStreamTrack, stream as unknown as MediaStream),
    createOffer: () => pc.createOffer().then((d) => ({ sdp: d.sdp ?? "", type: d.type })),
    createAnswer: () => pc.createAnswer().then((d) => ({ sdp: d.sdp ?? "", type: d.type })),
    setLocalDescription: (desc) => pc.setLocalDescription(desc as RTCSessionDescriptionInit),
    setRemoteDescription: (desc) => pc.setRemoteDescription(desc as RTCSessionDescriptionInit),
    addIceCandidate: (candidate) => pc.addIceCandidate(candidate as RTCIceCandidateInit),
    close: () => pc.close(),
    onIceCandidate: (cb) => {
      pc.onicecandidate = (e) => {
        if (e.candidate) cb(e.candidate.toJSON());
      };
    },
    onTrack: (cb) => {
      pc.ontrack = (e) => cb(e.streams[0] as unknown as MediaStreamLike);
    },
    onConnectionStateChange: (cb) => {
      pc.onconnectionstatechange = () => cb(pc.connectionState);
    },
  };
}

export const webrtcAdapter: WebRTCAdapter = {
  createPeerConnection: (config: { iceServers: RTCIceServer[] }) =>
    wrapPeerConnection(new RTCPeerConnection({ iceServers: config.iceServers as globalThis.RTCIceServer[] })),
  getUserMedia: (constraints) =>
    navigator.mediaDevices.getUserMedia(constraints) as unknown as Promise<MediaStreamLike>,
  stopStream: (stream) => stream.getTracks().forEach((t) => t.stop()),
};
