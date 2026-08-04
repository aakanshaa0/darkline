import { create } from "zustand";
import { callsApi, getSocket, type ApiCall } from "@shared/api";
import { webrtcAdapter, type RTCPeerConnectionLike, type MediaStreamLike } from "@shared/webrtc";
import type { CallHistoryEntry } from "./selectors";
import { useChatStore } from "./chatStore";
import { useAppStore, type CallKind } from "./appStore";

/**
 * Real WebRTC calling (Part B.3.A) — outgoing calls are fully wired
 * (getUserMedia → RTCPeerConnection → offer/answer/ICE via ws-signaling →
 * connected). Incoming calls auto-answer rather than showing a real
 * accept/decline screen — that's a real, documented scope cut (see
 * README), not an oversight; #29 "Incoming call screen" was already a
 * listed gap even in the original design spec.
 *
 * ICE servers: a public STUN server only, no TURN — calls will work
 * peer-to-peer or on permissive NATs (including localhost/LAN testing)
 * but may fail across restrictive corporate/mobile NATs without a TURN
 * relay, which isn't provisioned anywhere in this stack yet.
 */

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

let pc: RTCPeerConnectionLike | null = null;
let localStream: MediaStreamLike | null = null;
let activeCallId: string | null = null;
let listenersRegistered = false;

interface CallState {
  callHistory: CallHistoryEntry[];
  callHistoryLoading: boolean;
  remoteStream: MediaStreamLike | null;

  loadCallHistory: () => Promise<void>;
  placeCall: (contactUserId: string, kind: CallKind) => Promise<void>;
  hangUp: () => void;
  setLocalAudioEnabled: (enabled: boolean) => void;
  registerCallSignaling: () => void;
  reset: () => void;
}

function toEntry(call: ApiCall, myUserId: string | null): CallHistoryEntry {
  const contacts = useChatStore.getState().contacts;
  const otherId = call.participants.find((id) => id !== myUserId) ?? call.participants[0] ?? "";
  const contact = contacts.find((c) => c.id === otherId);

  return {
    id: call._id,
    name: contact?.name ?? "Unknown",
    initials: contact?.initials ?? "?",
    kind: call.kind,
    mode: call.mode,
    missed: call.status === "missed",
    duration: call.durationSec ? formatDuration(call.durationSec) : "—",
    time: new Date(call.startedAt).toLocaleString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    }),
    contactId: otherId,
    kindLabel: call.kind === "video" ? "Video" : call.kind === "group" ? "Group" : "Audio",
    modeLabel: call.mode === "internet" ? "internet" : "local network",
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function teardownPeerConnection(set: (partial: Partial<CallState>) => void) {
  pc?.close();
  pc = null;
  if (localStream) webrtcAdapter.stopStream(localStream);
  localStream = null;
  activeCallId = null;
  set({ remoteStream: null });
}

async function createConnection(
  callId: string,
  kind: CallKind,
  set: (partial: Partial<CallState>) => void,
): Promise<RTCPeerConnectionLike> {
  activeCallId = callId;
  localStream = await webrtcAdapter.getUserMedia({ audio: true, video: kind === "video" });
  const connection = webrtcAdapter.createPeerConnection({ iceServers: ICE_SERVERS });

  localStream.getTracks().forEach((track) => connection.addTrack(track, localStream!));

  connection.onIceCandidate((candidate) => {
    getSocket()?.emit("webrtc:ice-candidate", { callId, candidate });
  });
  connection.onTrack((stream) => set({ remoteStream: stream }));
  connection.onConnectionStateChange((state) => {
    if (state === "connected") useAppStore.setState({ callPhase: "active" });
  });

  pc = connection;
  return connection;
}

export const useCallStore = create<CallState>()((set, get) => ({
  callHistory: [],
  callHistoryLoading: false,
  remoteStream: null,

  loadCallHistory: async () => {
    set({ callHistoryLoading: true });
    try {
      const { calls } = await callsApi.listCalls();
      const myUserId = useChatStore.getState().currentUserId;
      set({ callHistory: calls.map((c) => toEntry(c, myUserId)), callHistoryLoading: false });
    } catch {
      set({ callHistoryLoading: false });
    }
  },

  placeCall: async (contactUserId, kind) => {
    const socket = getSocket();
    if (!socket) return;

    await useChatStore.getState().openDirectConversation(contactUserId);
    const conversationId = useChatStore.getState().activeConversationId;
    if (!conversationId) return;

    const callId = crypto.randomUUID();
    const connection = await createConnection(callId, kind, set);

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    socket.emit("call:invite", { callId, conversationId, kind });
    socket.emit("webrtc:offer", { callId, sdp: offer.sdp });

    callsApi
      .createCall({ conversationId, kind, mode: "internet", participantIds: [contactUserId] })
      .catch(() => undefined);
  },

  hangUp: () => {
    const callId = activeCallId;
    if (callId) getSocket()?.emit("call:end", { callId });
    teardownPeerConnection(set);
  },

  setLocalAudioEnabled: (enabled) => {
    localStream?.getTracks().forEach((track) => {
      if (track.kind === "audio") track.enabled = enabled;
    });
  },

  /** Registers the incoming-call/signaling socket listeners — call once per socket connection (see appStore's afterAuthenticated). */
  registerCallSignaling: () => {
    if (listenersRegistered) return;
    listenersRegistered = true;
    const socket = getSocket();
    if (!socket) return;

    socket.on(
      "call:invite",
      async ({ callId, kind, from }: { callId: string; conversationId: string; kind: CallKind; from: string }) => {
        // Auto-answer — see file header comment.
        const connection = await createConnection(callId, kind, set);
        useAppStore.setState({ screen: "call", callContactId: from, callKind: kind, callPhase: "ringing" });
        socket.emit("call:answer", { callId });

        socket.once("webrtc:offer", async ({ sdp }: { callId: string; sdp: string }) => {
          await connection.setRemoteDescription({ sdp, type: "offer" });
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          socket.emit("webrtc:answer", { callId, sdp: answer.sdp });
        });
      },
    );

    socket.on("webrtc:answer", async ({ sdp }: { callId: string; sdp: string }) => {
      await pc?.setRemoteDescription({ sdp, type: "answer" });
    });

    socket.on("webrtc:ice-candidate", ({ candidate }: { callId: string; candidate: unknown }) => {
      pc?.addIceCandidate(candidate).catch(() => undefined);
    });

    socket.on("call:end", () => {
      teardownPeerConnection(set);
      useAppStore.getState().endCall();
    });
  },

  reset: () => {
    listenersRegistered = false;
    teardownPeerConnection(set);
    set({ callHistory: [] });
  },
}));
