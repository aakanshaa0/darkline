import { create } from "zustand";
import { callsApi, getSocket, type ApiCall } from "@shared/api";
import { getSodium } from "@shared/crypto";
import { ensureCallPermissions } from "@shared/permissions";
import { webrtcAdapter, type RTCPeerConnectionLike, type MediaStreamLike, type RTCIceServer } from "@shared/webrtc";
import type { CallSignaling } from "@shared/p2p/types";
import {
  isLocalTransportAvailable,
  openLocalCallSignaling,
  acceptLocalCallSignaling,
  closeLocalTransport,
} from "@shared/p2p/localCall";
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
 * ICE servers come from GET /calls/ice-servers, which returns STUN plus —
 * when TURN_URL/TURN_SECRET are configured — short-lived HMAC TURN
 * credentials for a relay. Fetched once per session and cached; if the
 * request fails we fall back to bare STUN rather than failing the call,
 * which still connects on permissive NATs.
 */

const STUN_ONLY: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

let iceServersCache: RTCIceServer[] | null = null;

async function getIceServers(): Promise<RTCIceServer[]> {
  if (iceServersCache) return iceServersCache;
  try {
    const { iceServers } = await callsApi.getIceServers();
    return (iceServersCache = iceServers.length > 0 ? iceServers : STUN_ONLY);
  } catch {
    return STUN_ONLY; // not cached — a later call retries the fetch
  }
}

let pc: RTCPeerConnectionLike | null = null;
let localStream: MediaStreamLike | null = null;
let activeCallId: string | null = null;
let listenersRegistered = false;

/**
 * Signaling path for the call in progress. Null means "use the internet
 * socket"; a CallSignaling with mode "local" means SDP/ICE is travelling
 * over a WiFi Direct TCP link with no server in the middle (Part B.3.B).
 * Everything below emits through activeSignaling() so the two are
 * interchangeable — the event names are identical on both.
 */
let localSignaling: CallSignaling | null = null;

function socketSignaling(): CallSignaling | null {
  const socket = getSocket();
  if (!socket) return null;
  return {
    mode: "internet",
    emit: (event, payload) => socket.emit(event, payload),
    on: (event, cb) => socket.on(event, cb),
    once: (event, cb) => socket.once(event, cb),
    close: () => undefined, // the socket outlives any single call
  };
}

function activeSignaling(): CallSignaling | null {
  return localSignaling ?? socketSignaling();
}

/**
 * Hermes has no global `crypto`, so crypto.randomUUID() threw
 * "Property 'crypto' doesn't exist" on every call attempt. libsodium is
 * already loaded for E2EE and its RNG works on both platforms.
 */
async function randomCallId(): Promise<string> {
  const sodium = await getSodium();
  const bytes = sodium.randombytes_buf(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface CallState {
  callHistory: CallHistoryEntry[];
  callHistoryLoading: boolean;
  remoteStream: MediaStreamLike | null;

  loadCallHistory: () => Promise<void>;
  placeCall: (contactUserId: string, kind: CallKind) => Promise<void>;
  /** Offline call over WiFi Direct. `deviceAddress` comes from peer discovery, not a userId. */
  placeLocalCall: (deviceAddress: string, conversationId: string, kind: CallKind) => Promise<void>;
  /** Opens the offline signaling link so an incoming WiFi Direct call can arrive. */
  listenForLocalCall: () => Promise<void>;
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

  // Ask before touching getUserMedia — an ungranted mic/camera makes it
  // reject, which previously surfaced as a dead "Calling…" screen.
  const granted = await ensureCallPermissions(kind === "video" ? "video" : "audio");
  if (!granted) throw new Error("Microphone/camera permission denied — cannot start the call");

  localStream = await webrtcAdapter.getUserMedia({ audio: true, video: kind === "video" });
  const connection = webrtcAdapter.createPeerConnection({ iceServers: await getIceServers() });

  localStream.getTracks().forEach((track) => connection.addTrack(track, localStream!));

  connection.onIceCandidate((candidate) => {
    activeSignaling()?.emit("webrtc:ice-candidate", { callId, candidate: candidate as Record<string, unknown> });
  });
  connection.onTrack((stream) => set({ remoteStream: stream }));
  connection.onConnectionStateChange((state) => {
    if (state === "connected") useAppStore.setState({ callPhase: "active" });
  });

  pc = connection;
  return connection;
}

/** Offer + invite, identical on both transports — only the channel differs. */
async function startOutgoingCall(
  callId: string,
  conversationId: string,
  kind: CallKind,
  set: (partial: Partial<CallState>) => void,
): Promise<void> {
  const signaling = activeSignaling();
  if (!signaling) return;

  const connection = await createConnection(callId, kind, set);
  const offer = await connection.createOffer();
  await connection.setLocalDescription(offer);

  signaling.emit("call:invite", { callId, conversationId, kind });
  signaling.emit("webrtc:offer", { callId, sdp: offer.sdp });
}

/**
 * The four inbound events, bound to whichever channel is passed in. Written
 * once and attached to the internet socket at sign-in and to a local channel
 * when one opens, so offline calls get identical behaviour for free.
 */
function registerSignalingHandlers(
  signaling: CallSignaling,
  set: (partial: Partial<CallState>) => void,
): void {
  /**
   * The offer is subscribed to up front, not inside the call:invite handler.
   * The caller emits call:invite and webrtc:offer back-to-back, while the
   * callee's invite handler awaits permissions, getUserMedia and ICE config —
   * so the offer reliably arrives first. Registering late dropped it and the
   * call sat on "Calling…" forever. If it lands before the peer connection
   * exists, hold it and apply it as soon as createConnection resolves.
   */
  let pendingOffer: string | null = null;

  async function applyOffer(connection: RTCPeerConnectionLike, callId: string, sdp: string) {
    await connection.setRemoteDescription({ sdp, type: "offer" });
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    signaling.emit("webrtc:answer", { callId, sdp: answer.sdp });
  }

  signaling.on("webrtc:offer", async ({ callId, sdp }: { callId: string; sdp: string }) => {
    if (!pc) {
      pendingOffer = sdp; // connection still being set up — replayed below
      return;
    }
    await applyOffer(pc, callId, sdp);
  });

  signaling.on(
    "call:invite",
    async ({ callId, kind, from }: { callId: string; conversationId: string; kind: CallKind; from: string }) => {
      // Auto-answer — see file header comment.
      const connection = await createConnection(callId, kind, set);
      useAppStore.setState({ screen: "call", callContactId: from, callKind: kind, callPhase: "ringing" });
      signaling.emit("call:answer", { callId });

      if (pendingOffer) {
        const sdp = pendingOffer;
        pendingOffer = null;
        await applyOffer(connection, callId, sdp);
      }
    },
  );

  signaling.on("webrtc:answer", async ({ sdp }: { callId: string; sdp: string }) => {
    await pc?.setRemoteDescription({ sdp, type: "answer" });
  });

  signaling.on("webrtc:ice-candidate", ({ candidate }: { callId: string; candidate: unknown }) => {
    pc?.addIceCandidate(candidate).catch(() => undefined);
  });

  signaling.on("call:end", () => {
    teardownPeerConnection(set);
    useAppStore.getState().endCall();
    void closeLocalSignaling();
  });
}

/** Tears down the WiFi Direct group after an offline call; no-op otherwise. */
async function closeLocalSignaling(): Promise<void> {
  if (!localSignaling) return;
  localSignaling.close();
  localSignaling = null;
  try {
    await closeLocalTransport();
  } catch {
    // Best-effort — the group may already be gone if the peer left first.
  }
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
    if (!socketSignaling()) return;

    await useChatStore.getState().openDirectConversation(contactUserId);
    const conversationId = useChatStore.getState().activeConversationId;
    if (!conversationId) return;

    const callId = await randomCallId();
    await startOutgoingCall(callId, conversationId, kind, set);

    callsApi
      .createCall({ conversationId, kind, mode: "internet", participantIds: [contactUserId] })
      .catch(() => undefined);
  },

  /**
   * Offline sibling of placeCall: forms a WiFi Direct group with the peer,
   * runs the identical offer/ICE exchange over the resulting TCP link, and
   * never touches ws-signaling. No REST call either — logging history needs
   * the API, which by definition isn't reachable here; the call is recorded
   * locally by the chat store's outbox and synced when connectivity returns.
   */
  placeLocalCall: async (deviceAddress, conversationId, kind) => {
    if (!isLocalTransportAvailable) return;

    const signaling = await openLocalCallSignaling(deviceAddress);
    localSignaling = signaling;
    registerSignalingHandlers(signaling, set);

    const callId = await randomCallId();
    await startOutgoingCall(callId, conversationId, kind, set);
  },

  /**
   * Accepting side offline: the peer has already formed the group, so this
   * just opens the TCP link and waits — the incoming "call:invite" handler
   * registered below drives the rest, exactly as it does on the internet path.
   */
  listenForLocalCall: async () => {
    if (!isLocalTransportAvailable || localSignaling) return;
    const signaling = await acceptLocalCallSignaling();
    localSignaling = signaling;
    registerSignalingHandlers(signaling, set);
  },

  hangUp: () => {
    const callId = activeCallId;
    if (callId) activeSignaling()?.emit("call:end", { callId });
    teardownPeerConnection(set);
    void closeLocalSignaling();
  },

  setLocalAudioEnabled: (enabled) => {
    localStream?.getTracks().forEach((track) => {
      if (track.kind === "audio") track.enabled = enabled;
    });
  },

  /** Registers the incoming-call/signaling socket listeners — call once per socket connection (see appStore's afterAuthenticated). */
  registerCallSignaling: () => {
    if (listenersRegistered) return;
    const signaling = socketSignaling();
    if (!signaling) return;
    listenersRegistered = true;
    registerSignalingHandlers(signaling, set);
  },

  reset: () => {
    listenersRegistered = false;
    teardownPeerConnection(set);
    void closeLocalSignaling();
    set({ callHistory: [] });
  },
}));
