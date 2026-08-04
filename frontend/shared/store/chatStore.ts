import { create } from "zustand";
import type { Socket } from "socket.io-client";
import {
  contactsApi,
  conversationsApi,
  usersApi,
  presenceApi,
  prekeysApi,
  type ApiContact,
  type ApiConversation,
  type ApiMessage,
  type PublicProfile,
  type FetchedPrekeyBundleDto,
} from "@shared/api";
import {
  getSodium,
  loadOrCreateIdentity,
  encryptForRecipient,
  decryptFromSender,
  isUndecryptable,
  type Envelope,
} from "@shared/crypto";
import type { Presence } from "@shared/connectivity";

export interface LiveContact {
  id: string; // Mongo user _id
  name: string;
  username: string;
  initials: string;
  presence: Presence;
  sub: string;
}

export interface DecryptedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  fromMe: boolean;
  text: string;
  senderName?: string;
  createdAt: string;
  pending?: boolean;
}

export interface LiveConversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  otherUserId: string | null; // direct conversations only
  lastMessageAt: string | null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function contactFromProfile(profile: PublicProfile, presence: Presence = "offline"): LiveContact {
  return {
    id: profile.id,
    name: profile.name || profile.username || "Unknown",
    username: profile.username || "",
    initials: initialsFromName(profile.name || profile.username || "?"),
    presence,
    sub: profile.username ? `@${profile.username}` : "",
  };
}

interface ChatState {
  currentUserId: string | null;

  contacts: LiveContact[];
  contactsLoading: boolean;
  searchResults: PublicProfile[];
  searchLoading: boolean;

  conversations: LiveConversation[];
  messagesByConversation: Record<string, DecryptedMessage[]>;
  /** False once a page comes back short — nothing older is left to fetch. */
  hasMoreByConversation: Record<string, boolean>;
  /** Guards against a scroll handler firing another fetch mid-flight. */
  loadingOlderByConversation: Record<string, boolean>;
  activeConversationId: string | null;


  setCurrentUserId: (userId: string | null) => void;
  loadInitialData: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  addContact: (userId: string) => Promise<void>;
  openDirectConversation: (contactUserId: string) => Promise<void>;
  openGroupConversation: (conversationId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  /** Fetches the page before the oldest message currently held. No-op when exhausted or already running. */
  loadOlderMessages: (conversationId: string) => Promise<void>;
  registerSocketListeners: (socket: Socket) => void;
  reset: () => void;
}

/**
 * Own messages take the same path as everyone else's now: encryptForRecipient
 * writes a `selfCiphertext` sealed to our own prekey, so decryptFromSender can
 * open our sent messages after a reload instead of relying on a session Map.
 */
async function decryptIncoming(ciphertext: string, _myUserId: string, _senderId: string): Promise<string> {
  try {
    const sodium = await getSodium();
    const envelope = JSON.parse(ciphertext) as Envelope;
    const { identity } = await loadOrCreateIdentity();
    return decryptFromSender(sodium, envelope, identity);
  } catch (err) {
    // Only surface genuine faults. A legacy envelope or one sealed to another
    // device's key is expected and already shown by the lock placeholder —
    // logging those spams LogBox on every thread open, and its overlay sits
    // on top of the composer.
    if (!isUndecryptable(err)) console.warn("[decryptIncoming] failed", err);
    return "🔒 Couldn't decrypt this message";
  }
}

async function toDecryptedMessage(m: ApiMessage, myUserId: string): Promise<DecryptedMessage> {
  return {
    id: m._id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    fromMe: m.senderId === myUserId,
    text: await decryptIncoming(m.ciphertext, myUserId, m.senderId),
    createdAt: m.createdAt,
  };
}

function toLiveConversation(c: ApiConversation, myUserId: string): LiveConversation {
  const other = c.type === "direct" ? c.participants.find((p) => p.user?.id !== myUserId)?.user ?? null : null;
  return {
    id: c.id,
    type: c.type,
    name: c.type === "group" ? c.name : (other?.name ?? null),
    otherUserId: other?.id ?? null,
    lastMessageAt: c.lastMessageAt,
  };
}

export const useChatStore = create<ChatState>()((set, get) => ({
  currentUserId: null,
  contacts: [],
  contactsLoading: false,
  searchResults: [],
  searchLoading: false,
  conversations: [],
  messagesByConversation: {},
  hasMoreByConversation: {},
  loadingOlderByConversation: {},
  activeConversationId: null,

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  loadInitialData: async () => {
    set({ contactsLoading: true });
    try {
      const [{ contacts }, { conversations }] = await Promise.all([
        contactsApi.listContacts(),
        conversationsApi.listConversations(),
      ]);

      const myUserId = get().currentUserId;
      const liveContacts = contacts
        .filter((c): c is ApiContact & { user: PublicProfile } => !!c.user)
        .map((c) => contactFromProfile(c.user));

      set({
        contacts: liveContacts,
        conversations: myUserId ? conversations.map((c) => toLiveConversation(c, myUserId)) : [],
        contactsLoading: false,
      });

      // Presence REST fallback (Part D.2) — fills in status for contacts who
      // were already online/offline before this session's socket connected.
      liveContacts.forEach(async (c) => {
        try {
          const presence = await presenceApi.getPresence(c.id);
          set((s) => ({
            contacts: s.contacts.map((x) => (x.id === c.id ? { ...x, presence: presence.status } : x)),
          }));
        } catch {
          // Leave at default "offline" — non-fatal.
        }
      });
    } catch {
      set({ contactsLoading: false });
    }
  },

  searchUsers: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ searchLoading: true });
    try {
      const { users } = await usersApi.searchUsers(query);
      set({ searchResults: users, searchLoading: false });
    } catch {
      set({ searchLoading: false });
    }
  },

  addContact: async (userId) => {
    const { contact } = await contactsApi.createContact({ contactUserId: userId, source: "search" });
    if (contact.user) {
      // Deliberately NOT removed from searchResults — NearbyTabList keeps the
      // row visible and swaps its action label to "Added" instead.
      set((s) => ({ contacts: [...s.contacts, contactFromProfile(contact.user!)] }));
      try {
        const presence = await presenceApi.getPresence(userId);
        set((s) => ({ contacts: s.contacts.map((c) => (c.id === userId ? { ...c, presence: presence.status } : c)) }));
      } catch {
        // Leave at default "offline" — non-fatal, same fallback as loadInitialData.
      }
    }
  },

  openDirectConversation: async (contactUserId) => {
    const existing = get().conversations.find((c) => c.type === "direct" && c.otherUserId === contactUserId);
    const myUserId = get().currentUserId;
    let conversationId = existing?.id;

    if (!conversationId) {
      const { conversation } = await conversationsApi.createConversation({
        type: "direct",
        participantIds: [contactUserId],
      });
      conversationId = conversation.id;
      if (myUserId) {
        set((s) => ({ conversations: [...s.conversations, toLiveConversation(conversation, myUserId)] }));
      }
    }

    set({ activeConversationId: conversationId });
    await loadMessagesForConversation(conversationId, set, get);
  },

  openGroupConversation: async (conversationId) => {
    set({ activeConversationId: conversationId });
    // Group E2EE (Sender Keys) isn't wired up yet — see e2eeCore.ts's group
    // functions, which exist but aren't connected to key distribution here.
    // Not reachable in practice yet either, since there's no create-group UI.
    set((s) => ({ messagesByConversation: { ...s.messagesByConversation, [conversationId]: [] } }));
  },

  loadOlderMessages: async (conversationId) => {
    const state = get();
    if (state.loadingOlderByConversation[conversationId]) return;
    if (state.hasMoreByConversation[conversationId] === false) return;

    const existing = state.messagesByConversation[conversationId] ?? [];
    const oldest = existing[0];
    if (!oldest) return;

    const myUserId = state.currentUserId;
    if (!myUserId) return;

    set((s) => ({
      loadingOlderByConversation: { ...s.loadingOlderByConversation, [conversationId]: true },
    }));

    try {
      const { messages } = await conversationsApi.listMessages(conversationId, {
        limit: MESSAGE_PAGE_SIZE,
        before: oldest.createdAt,
      });
      const decrypted = await Promise.all(messages.map((m) => toDecryptedMessage(m, myUserId)));

      set((s) => {
        const current = s.messagesByConversation[conversationId] ?? [];
        // Re-check by id: a socket delivery or a second fetch may have landed
        // while this request was in flight.
        const known = new Set(current.map((m) => m.id));
        const fresh = decrypted.filter((m) => !known.has(m.id));
        return {
          messagesByConversation: { ...s.messagesByConversation, [conversationId]: [...fresh, ...current] },
          hasMoreByConversation: {
            ...s.hasMoreByConversation,
            [conversationId]: messages.length === MESSAGE_PAGE_SIZE,
          },
          loadingOlderByConversation: { ...s.loadingOlderByConversation, [conversationId]: false },
        };
      });
    } catch {
      set((s) => ({
        loadingOlderByConversation: { ...s.loadingOlderByConversation, [conversationId]: false },
      }));
    }
  },

  sendMessage: async (text) => {
    const { activeConversationId, conversations, currentUserId } = get();
    if (!activeConversationId || !currentUserId) return;
    const conversation = conversations.find((c) => c.id === activeConversationId);
    if (!conversation || conversation.type !== "direct" || !conversation.otherUserId) return;

    const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: DecryptedMessage = {
      id: localId,
      conversationId: activeConversationId,
      senderId: currentUserId,
      fromMe: true,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    appendMessage(set, activeConversationId, optimistic);

    try {
      const bundle = await fetchPrekeyBundles(conversation.otherUserId);
      const sodium = await getSodium();
      const { identity } = await loadOrCreateIdentity();
      const envelope = encryptForRecipient(sodium, text, bundle, identity);
      const ciphertext = JSON.stringify(envelope);

      const { message } = await conversationsApi.sendMessage(activeConversationId, {
        localId,
        ciphertext,
        transportMode: "internet",
      });

      set((s) => ({
        messagesByConversation: {
          ...s.messagesByConversation,
          [activeConversationId]: s.messagesByConversation[activeConversationId].map((m) =>
            m.id === localId ? { ...m, id: message._id, pending: false } : m,
          ),
        },
      }));
    } catch (err) {
      console.warn("[sendMessage] failed", err);
      set((s) => ({
        messagesByConversation: {
          ...s.messagesByConversation,
          [activeConversationId]: s.messagesByConversation[activeConversationId].filter((m) => m.id !== localId),
        },
      }));
    }
  },

  registerSocketListeners: (socket) => {
    socket.on(
      "message:new",
      async (payload: {
        messageId: string;
        conversationId: string;
        senderId: string;
        ciphertext: string;
        createdAt: string;
      }) => {
        const myUserId = get().currentUserId;
        if (!myUserId || payload.senderId === myUserId) return; // own messages already appended optimistically
        const text = await decryptIncoming(payload.ciphertext, myUserId, payload.senderId);
        appendMessage(set, payload.conversationId, {
          id: payload.messageId,
          conversationId: payload.conversationId,
          senderId: payload.senderId,
          fromMe: false,
          text,
          createdAt: payload.createdAt,
        });
      },
    );

    socket.on("presence:update", (payload: { userId: string; status: Presence }) => {
      set((s) => ({
        contacts: s.contacts.map((c) => (c.id === payload.userId ? { ...c, presence: payload.status } : c)),
      }));
    });
  },

  reset: () =>
    set({
      currentUserId: null,
      contacts: [],
      searchResults: [],
      conversations: [],
      messagesByConversation: {},
      hasMoreByConversation: {},
      loadingOlderByConversation: {},
      activeConversationId: null,
        }),
}));

function appendMessage(
  set: (fn: (s: ChatState) => Partial<ChatState>) => void,
  conversationId: string,
  message: DecryptedMessage,
): void {
  set((s) => ({
    messagesByConversation: {
      ...s.messagesByConversation,
      [conversationId]: [...(s.messagesByConversation[conversationId] ?? []), message],
    },
  }));
}

/**
 * Opening a thread loads only the newest page; older messages arrive via
 * loadOlderMessages when the user scrolls up. The server returns newest-first
 * and reverses, so `messages` is already oldest→newest within the page.
 */
export const MESSAGE_PAGE_SIZE = 30;

async function loadMessagesForConversation(
  conversationId: string,
  set: (fn: (s: ChatState) => Partial<ChatState>) => void,
  get: () => ChatState,
): Promise<void> {
  const { messages } = await conversationsApi.listMessages(conversationId, { limit: MESSAGE_PAGE_SIZE });
  const myUserId = get().currentUserId;
  if (!myUserId) return;
  const decrypted = await Promise.all(messages.map((m) => toDecryptedMessage(m, myUserId)));
  set((s) => ({
    messagesByConversation: { ...s.messagesByConversation, [conversationId]: decrypted },
    // A full page means there may be more behind it; a short one means there isn't.
    hasMoreByConversation: {
      ...s.hasMoreByConversation,
      [conversationId]: messages.length === MESSAGE_PAGE_SIZE,
    },
  }));
}

/**
 * Every registered device of `userId`, so the sender can seal one copy each.
 * NOT cached: a recipient can register a new device at any time, and a stale
 * list silently produces messages that device can never read.
 */
async function fetchPrekeyBundles(userId: string): Promise<FetchedPrekeyBundleDto[]> {
  const res = await prekeysApi.getPrekeyBundle(userId);
  // Older servers return a single bundle with no `bundles` array.
  return res.bundles && res.bundles.length > 0 ? res.bundles : [res];
}
