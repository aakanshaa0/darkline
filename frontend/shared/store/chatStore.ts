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
import { getSodium, loadOrCreateIdentity, encryptForRecipient, decryptFromSender, type Envelope } from "@shared/crypto";
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

// Own sent-message plaintexts, session-only (see chatStore.ts header comment
// on sendMessage for why this exists — it's a real, documented limitation,
// not an oversight: a full fix needs the WatermelonDB persistence layer
// (shared/db, already built) wired in here, which hasn't been done yet).
const sentPlaintextCache = new Map<string, string>();

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
  activeConversationId: string | null;

  prekeyCache: Record<string, FetchedPrekeyBundleDto>;

  setCurrentUserId: (userId: string | null) => void;
  loadInitialData: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  addContact: (userId: string) => Promise<void>;
  openDirectConversation: (contactUserId: string) => Promise<void>;
  openGroupConversation: (conversationId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  registerSocketListeners: (socket: Socket) => void;
  reset: () => void;
}

async function decryptIncoming(ciphertext: string, myUserId: string, senderId: string): Promise<string> {
  if (senderId === myUserId) {
    return sentPlaintextCache.get(ciphertext) ?? "📤 Sent message (unavailable after reload)";
  }
  try {
    const sodium = await getSodium();
    const envelope = JSON.parse(ciphertext) as Envelope;
    const { identity } = await loadOrCreateIdentity();
    return decryptFromSender(sodium, envelope, identity);
  } catch (err) {
    console.error("[decryptIncoming] failed", err);
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
  activeConversationId: null,
  prekeyCache: {},

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
      const bundle = await getOrFetchPrekeyBundle(get, set, conversation.otherUserId);
      const sodium = await getSodium();
      const { identity } = await loadOrCreateIdentity();
      const envelope = encryptForRecipient(sodium, text, bundle, identity);
      const ciphertext = JSON.stringify(envelope);
      sentPlaintextCache.set(ciphertext, text);

      const { message } = await conversationsApi.sendMessage(activeConversationId, {
        localId,
        ciphertext,
        transportMode: "internet",
      });
      sentPlaintextCache.set(message.ciphertext, text);

      set((s) => ({
        messagesByConversation: {
          ...s.messagesByConversation,
          [activeConversationId]: s.messagesByConversation[activeConversationId].map((m) =>
            m.id === localId ? { ...m, id: message._id, pending: false } : m,
          ),
        },
      }));
    } catch (err) {
      console.error("[sendMessage] failed", err);
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
      activeConversationId: null,
      prekeyCache: {},
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

async function loadMessagesForConversation(
  conversationId: string,
  set: (fn: (s: ChatState) => Partial<ChatState>) => void,
  get: () => ChatState,
): Promise<void> {
  const { messages } = await conversationsApi.listMessages(conversationId);
  const myUserId = get().currentUserId;
  if (!myUserId) return;
  const decrypted = await Promise.all(messages.map((m) => toDecryptedMessage(m, myUserId)));
  set((s) => ({ messagesByConversation: { ...s.messagesByConversation, [conversationId]: decrypted } }));
}

async function getOrFetchPrekeyBundle(
  get: () => ChatState,
  set: (fn: (s: ChatState) => Partial<ChatState>) => void,
  userId: string,
): Promise<FetchedPrekeyBundleDto> {
  const cached = get().prekeyCache[userId];
  if (cached) return cached;
  const bundle = await prekeysApi.getPrekeyBundle(userId);
  set((s) => ({ prekeyCache: { ...s.prekeyCache, [userId]: bundle } }));
  return bundle;
}
