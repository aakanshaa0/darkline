import { create } from "zustand";
import type { Presence } from "@shared/connectivity";
import { authApi, prekeysApi, connectSocket, disconnectSocket, loadTokens, ApiError, type AuthResult } from "@shared/api";
import { loadOrCreateIdentity } from "@shared/crypto";

/**
 * State shape ported directly from the prototype's Component.state in
 * docs/design-reference/Darkline App.dc.html and Darkline Web.dc.html —
 * see design-handoff.md "State Management" section. One store serves both
 * the mobile shell (app/App.tsx, drives `screen`) and the web shell
 * (web/WebApp.tsx, which has no auth of its own — see design-handoff.md —
 * so it ignores every screen except thread/group/call/groupcall, rendered
 * as right-panel content while the list panel stays permanently visible).
 */

export type { Presence };
export type Screen =
  | "splash"
  | "auth"
  | "signup"
  | "login"
  | "emailVerify"
  | "forgotPassword"
  | "resetPassword"
  | "phoneEntry"
  | "otpVerify"
  | "accountExists"
  | "accountLocked"
  | "sessionExpired"
  | "biometricPrompt"
  | "pushPermission"
  | "profile"
  | "account"
  | "linkedAccounts"
  | "home"
  | "thread"
  | "group"
  | "call"
  | "groupcall";
export type Tab = "chats" | "calls" | "nearby";
export type CallKind = "audio" | "video";
export type CallPhase = "ringing" | "active";

export interface Contact {
  id: string;
  name: string;
  initials: string;
  presence: Presence;
  sub: string;
}

export interface ChatMessage {
  fromMe: boolean;
  text: string;
}

export interface GroupMessage {
  fromMe: boolean;
  text: string;
  senderName?: string;
}

interface AppState {
  screen: Screen;
  tab: Tab;
  activeContactId: string | null;
  callContactId: string | null;
  callKind: CallKind;
  callPhase: CallPhase;
  muted: boolean;
  speakerOn: boolean;
  addedNearby: Record<string, boolean>;
  contacts: Contact[];
  messages: Record<string, ChatMessage[]>;
  groupMessages: GroupMessage[];

  // ── Real auth wiring (shared/api) — see signupWithEmail etc. below ──
  authLoading: boolean;
  authError: string | null;
  currentUserId: string | null;
  pendingAuthUserId: string | null; // set by signupWithEmail, consumed by verifyEmailCode
  pendingPhone: string | null; // set by sendPhoneOtp, consumed by verifyPhoneOtpCode

  navigate: (screen: Screen) => void;
  goHome: () => void;
  backToHome: () => void;
  setTab: (tab: Tab) => void;
  openThread: (id: string) => void;
  openGroup: () => void;
  sendDemo: () => void;
  sendGroupDemo: () => void;
  addNearby: (id: string) => void;
  startCall: (contactId: string | null, kind: CallKind) => void;
  startGroupCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;

  signupWithEmail: (name: string, username: string, email: string, password: string) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtpCode: (code: string) => Promise<void>;
  logoutUser: () => Promise<void>;
}

let callTimer: ReturnType<typeof setTimeout> | null = null;
function clearCallTimer() {
  if (callTimer) {
    clearTimeout(callTimer);
    callTimer = null;
  }
}

export const useAppStore = create<AppState>()((set, get) => ({
  screen: "splash",
  tab: "chats",
  activeContactId: null,
  callContactId: null,
  callKind: "audio",
  callPhase: "ringing",
  muted: false,
  speakerOn: false,
  addedNearby: {},

  authLoading: false,
  authError: null,
  currentUserId: null,
  pendingAuthUserId: null,
  pendingPhone: null,

  contacts: [
    { id: "jordan", name: "Jordan M.", initials: "JM", presence: "online", sub: "on my way!" },
    { id: "sara", name: "Sara A.", initials: "SA", presence: "online", sub: "sent a photo" },
    { id: "tariq", name: "Tariq K.", initials: "TK", presence: "wifi", sub: "chat + call" },
    { id: "priya", name: "Priya L.", initials: "PL", presence: "ble", sub: "text only, no signal" },
    { id: "dana", name: "Dana W.", initials: "DW", presence: "offline", sub: "last seen 2h ago" },
  ],

  messages: {
    jordan: [
      { fromMe: false, text: "Hey, you around later?" },
      { fromMe: true, text: "Yeah, free after 6" },
    ],
    sara: [
      { fromMe: false, text: "Sent a photo from the trip" },
      { fromMe: true, text: "That view is incredible" },
    ],
    tariq: [
      { fromMe: false, text: "Are you nearby right now?" },
      { fromMe: true, text: "Yeah, connected via wifi direct" },
    ],
    priya: [
      { fromMe: false, text: "Are you nearby right now?" },
      { fromMe: true, text: "Yeah, relaying over bluetooth mesh" },
    ],
    dana: [
      { fromMe: false, text: "Running late, sorry!" },
      { fromMe: true, text: "No worries — this'll sync once you're back online" },
    ],
  },

  groupMessages: [
    { fromMe: false, senderName: "Sara", text: "How about Saturday?" },
    { fromMe: false, senderName: "Jordan", text: "Works for me" },
    { fromMe: true, text: "I'm in too" },
  ],

  navigate: (screen) => set({ screen }),
  goHome: () => set({ screen: "home", tab: "chats" }),
  backToHome: () => set({ screen: "home" }),
  setTab: (tab) => set({ screen: "home", tab }),
  openThread: (id) => set({ screen: "thread", activeContactId: id }),
  openGroup: () => set({ screen: "group" }),

  sendDemo: () => {
    const { activeContactId, messages } = get();
    if (!activeContactId) return;
    const msgs = messages[activeContactId] ?? [];
    set({
      messages: { ...messages, [activeContactId]: [...msgs, { fromMe: true, text: "Got it 👍" }] },
    });
  },

  sendGroupDemo: () =>
    set((s) => ({ groupMessages: [...s.groupMessages, { fromMe: true, text: "Sounds good!" }] })),

  addNearby: (id) => set((s) => ({ addedNearby: { ...s.addedNearby, [id]: true } })),

  startCall: (contactId, kind) => {
    clearCallTimer();
    set({
      screen: "call",
      callContactId: contactId,
      callKind: kind,
      callPhase: "ringing",
      muted: false,
      speakerOn: false,
    });
    callTimer = setTimeout(() => set({ callPhase: "active" }), 1200);
  },

  startGroupCall: () => set({ screen: "groupcall" }),

  endCall: () => {
    clearCallTimer();
    set((s) => ({ screen: s.screen === "groupcall" ? "group" : "thread" }));
  },

  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleSpeaker: () => set((s) => ({ speakerOn: !s.speakerOn })),

  signupWithEmail: async (name, username, email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const { userId } = await authApi.signup({ name, username, email, password });
      set({ authLoading: false, pendingAuthUserId: userId, screen: "emailVerify" });
    } catch (err) {
      set({ authLoading: false, authError: authErrorMessage(err) });
    }
  },

  verifyEmailCode: async (code) => {
    const { pendingAuthUserId } = get();
    if (!pendingAuthUserId) return;
    set({ authLoading: true, authError: null });
    try {
      const result = await authApi.verifyEmail({ userId: pendingAuthUserId, code });
      // name/username were already collected by SignUpScreen (POST /auth/signup
      // requires them upfront), so no need to route through ProfileSetupScreen here.
      await completeAuth(set, result, "biometricPrompt");
    } catch (err) {
      set({ authLoading: false, authError: authErrorMessage(err) });
    }
  },

  loginWithEmail: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const result = await authApi.login({ email, password });
      await completeAuth(set, result, "biometricPrompt");
    } catch (err) {
      set({ authLoading: false, authError: authErrorMessage(err) });
      if (err instanceof ApiError && err.code === "ACCOUNT_LOCKED") set({ screen: "accountLocked" });
    }
  },

  sendPhoneOtp: async (phone) => {
    set({ authLoading: true, authError: null });
    try {
      await authApi.phoneSendOtp({ phone });
      set({ authLoading: false, pendingPhone: phone, screen: "otpVerify" });
    } catch (err) {
      set({ authLoading: false, authError: authErrorMessage(err) });
    }
  },

  verifyPhoneOtpCode: async (code) => {
    const { pendingPhone } = get();
    if (!pendingPhone) return;
    set({ authLoading: true, authError: null });
    try {
      const result = await authApi.phoneVerifyOtp({ phone: pendingPhone, code });
      await completeAuth(set, result, result.isNewUser ? "profile" : "biometricPrompt");
    } catch (err) {
      set({ authLoading: false, authError: authErrorMessage(err) });
    }
  },

  logoutUser: async () => {
    const tokens = await loadTokens();
    if (tokens) {
      try {
        await authApi.logout(tokens.refreshToken);
      } catch {
        // Already clears local tokens in the try path (see authApi.logout); if the
        // request itself failed, the refresh token just expires server-side instead.
      }
    }
    disconnectSocket();
    set({ currentUserId: null, pendingAuthUserId: null, pendingPhone: null, screen: "auth" });
  },
}));

function authErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

/**
 * Shared tail end of every successful signup/login/OTP/Google flow:
 * bootstrap the local E2EE identity (generating+uploading one on first
 * run — see shared/crypto), connect the signaling socket, and move on to
 * the onboarding chain (or straight to profile setup for brand-new users).
 */
async function completeAuth(
  set: (partial: Partial<AppState>) => void,
  result: AuthResult,
  nextScreen: Screen,
): Promise<void> {
  set({ authLoading: false, currentUserId: result.user._id, pendingAuthUserId: null, pendingPhone: null });

  try {
    const { freshBundle } = await loadOrCreateIdentity();
    if (freshBundle) await prekeysApi.uploadPrekeys(freshBundle);
  } catch {
    // Non-fatal — messaging will fail to encrypt to this user until keys exist,
    // but auth itself succeeded and shouldn't be blocked on this.
  }

  try {
    await connectSocket();
  } catch {
    // Non-fatal — ws-signaling may be unreachable; REST still works.
  }

  set({ screen: nextScreen });
}
