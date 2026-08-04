import { create } from "zustand";
import { Platform } from "react-native";
import type { Presence } from "@shared/connectivity";
import { authApi, prekeysApi, connectSocket, disconnectSocket, loadTokens, ApiError, type AuthResult } from "@shared/api";
import { loadOrCreateIdentity } from "@shared/crypto";
import { useChatStore } from "./chatStore";
import { useCallStore } from "./callStore";

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

// Live contacts/conversations/messages live in ./chatStore now — this
// store owns navigation, auth, and call-UI state only. Kept here as
// re-exports so existing imports of `Contact` etc. from "@shared/store"
// don't need to change.
export type { LiveContact as Contact, DecryptedMessage as ChatMessage } from "./chatStore";

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

  // ── Real auth wiring (shared/api) — see signupWithEmail etc. below ──
  bootstrapping: boolean; // true until the stored-token rehydration check resolves
  authLoading: boolean;
  authError: string | null;
  currentUserId: string | null;
  pendingAuthUserId: string | null; // set by signupWithEmail, consumed by verifyEmailCode
  pendingPhone: string | null; // set by sendPhoneOtp, consumed by verifyPhoneOtpCode

  navigate: (screen: Screen) => void;
  goHome: () => void;
  backToHome: () => void;
  setTab: (tab: Tab) => void;
  openThread: (contactUserId: string) => void;
  openGroup: (conversationId: string) => void;
  addNearby: (id: string) => void;
  startCall: (contactId: string | null, kind: CallKind) => void;
  startGroupCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;

  bootstrapSession: () => Promise<void>;
  signupWithEmail: (name: string, username: string, email: string, password: string) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtpCode: (code: string) => Promise<void>;
  logoutUser: () => Promise<void>;
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

  bootstrapping: true,
  authLoading: false,
  authError: null,
  currentUserId: null,
  pendingAuthUserId: null,
  pendingPhone: null,

  navigate: (screen) => set({ screen }),
  goHome: () => set({ screen: "home", tab: "chats" }),
  backToHome: () => set({ screen: "home" }),
  setTab: (tab) => set({ screen: "home", tab }),

  openThread: (contactUserId) => {
    set({ screen: "thread", activeContactId: contactUserId });
    useChatStore.getState().openDirectConversation(contactUserId);
  },

  openGroup: (conversationId) => {
    set({ screen: "group" });
    useChatStore.getState().openGroupConversation(conversationId);
  },

  addNearby: (id) => set((s) => ({ addedNearby: { ...s.addedNearby, [id]: true } })),

  startCall: (contactId, kind) => {
    set({
      screen: "call",
      callContactId: contactId,
      callKind: kind,
      callPhase: "ringing",
      muted: false,
      speakerOn: false,
    });
    if (contactId) useCallStore.getState().placeCall(contactId, kind);
  },

  startGroupCall: () => set({ screen: "groupcall" }),

  endCall: () => {
    useCallStore.getState().hangUp();
    set((s) => ({ screen: s.screen === "groupcall" ? "group" : "thread" }));
  },

  toggleMute: () =>
    set((s) => {
      const next = !s.muted;
      useCallStore.getState().setLocalAudioEnabled(!next);
      return { muted: next };
    }),
  toggleSpeaker: () => set((s) => ({ speakerOn: !s.speakerOn })),

  bootstrapSession: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ bootstrapping: false });
      return;
    }
    try {
      const { user } = await authApi.me();
      set({ bootstrapping: false, currentUserId: user._id, screen: "home", tab: "chats" });
      await afterAuthenticated(user._id);
    } catch {
      // httpClient's 401 handling already tried a refresh and cleared tokens if that failed too.
      set({ bootstrapping: false });
    }
  },

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
      await completeAuth(set, result, Platform.OS === "web" ? "home" : "biometricPrompt");
    } catch (err) {
      set({ authLoading: false, authError: authErrorMessage(err) });
    }
  },

  loginWithEmail: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const result = await authApi.login({ email, password });
      await completeAuth(set, result, Platform.OS === "web" ? "home" : "biometricPrompt");
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
      // New accounts (phone signup) still need a name/username on every platform —
      // only the biometric/push onboarding prompts after it are mobile-only.
      const nextScreen = result.isNewUser ? "profile" : Platform.OS === "web" ? "home" : "biometricPrompt";
      await completeAuth(set, result, nextScreen);
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
    useChatStore.getState().reset();
    useCallStore.getState().reset();
    set({ currentUserId: null, pendingAuthUserId: null, pendingPhone: null, screen: "auth" });
  },
}));

function authErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

/**
 * Runs after every successful signup/login/OTP/Google flow AND after a
 * successful session-rehydration on app start (bootstrapSession): bootstrap
 * the local E2EE identity (generating+uploading one on first run — see
 * shared/crypto), connect the signaling socket, register its listeners,
 * and load the real contacts/conversations list.
 */
async function afterAuthenticated(userId: string): Promise<void> {
  useChatStore.getState().setCurrentUserId(userId);

  try {
    const { freshBundle } = await loadOrCreateIdentity();
    if (freshBundle) await prekeysApi.uploadPrekeys(freshBundle);
  } catch {
    // Non-fatal — messaging will fail to encrypt to this user until keys exist,
    // but auth itself succeeded and shouldn't be blocked on this.
  }

  try {
    const socket = await connectSocket();
    useChatStore.getState().registerSocketListeners(socket);
    useCallStore.getState().registerCallSignaling();
  } catch {
    // Non-fatal — ws-signaling may be unreachable; REST still works.
  }

  useChatStore.getState().loadInitialData();
  useCallStore.getState().loadCallHistory();
}

/**
 * Shared tail end of every successful signup/login/OTP/Google flow —
 * see afterAuthenticated() above for what actually runs.
 */
async function completeAuth(
  set: (partial: Partial<AppState>) => void,
  result: AuthResult,
  nextScreen: Screen,
): Promise<void> {
  set({ authLoading: false, currentUserId: result.user._id, pendingAuthUserId: null, pendingPhone: null });
  await afterAuthenticated(result.user._id);
  set({ screen: nextScreen });
}
