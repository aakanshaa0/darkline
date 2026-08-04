import { apiRequest } from "./httpClient";
import type { ApiConversation, ApiMessage } from "./types";

export const listConversations = () => apiRequest<{ conversations: ApiConversation[] }>("/conversations");

export const createConversation = (input: { type: "direct" | "group"; participantIds: string[]; name?: string; photoUrl?: string }) =>
  apiRequest<{ conversation: ApiConversation }>("/conversations", { method: "POST", body: input });

export const getConversation = (id: string) => apiRequest<{ conversation: ApiConversation }>(`/conversations/${id}`);

export const updateConversation = (id: string, input: { name?: string; photoUrl?: string }) =>
  apiRequest<{ conversation: ApiConversation }>(`/conversations/${id}`, { method: "PATCH", body: input });

export const deleteConversation = (id: string) => apiRequest<void>(`/conversations/${id}`, { method: "DELETE" });

export const addMember = (id: string, userId: string) =>
  apiRequest<{ conversation: ApiConversation }>(`/conversations/${id}/members`, { method: "POST", body: { userId } });

export const removeMember = (id: string, userId: string) =>
  apiRequest<{ conversation: ApiConversation }>(`/conversations/${id}/members/${userId}`, { method: "DELETE" });

export const listMessages = (conversationId: string, params?: { limit?: number; before?: string }) =>
  apiRequest<{ messages: ApiMessage[] }>(`/conversations/${conversationId}/messages`, { query: params });

export const sendMessage = (
  conversationId: string,
  input: { localId: string; ciphertext: string; transportMode: "internet" | "local" | "ble"; attachments?: ApiMessage["attachments"] },
) => apiRequest<{ message: ApiMessage }>(`/conversations/${conversationId}/messages`, { method: "POST", body: input });
