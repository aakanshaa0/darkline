import { apiRequest } from "./httpClient";
import type { ApiUser, PublicProfile } from "./types";

export const getMe = () => apiRequest<{ user: ApiUser }>("/users/me");

export const updateMe = (input: { name?: string; username?: string; avatarUrl?: string }) =>
  apiRequest<{ user: ApiUser }>("/users/me", { method: "PATCH", body: input });

export const getUserById = (id: string) => apiRequest<{ user: PublicProfile }>(`/users/${id}`);

export const searchUsers = (q: string) => apiRequest<{ users: PublicProfile[] }>("/users/search", { query: { q } });

export const addDeviceToken = (input: { token: string; platform: "ios" | "android" | "web" }) =>
  apiRequest<void>("/users/me/device-token", { method: "POST", body: input });

export const getLinkedAccounts = () =>
  apiRequest<{
    email: { linked: boolean; value: string | null };
    phone: { linked: boolean; value: string | null };
    google: { linked: boolean };
  }>("/users/me/linked-accounts");

export const linkGoogleAccount = (idToken: string) =>
  apiRequest<{ user: ApiUser }>("/users/me/linked-accounts", { method: "POST", body: { provider: "google", idToken } });

export const linkPhoneAccount = (phone: string, code: string) =>
  apiRequest<{ user: ApiUser }>("/users/me/linked-accounts", { method: "POST", body: { provider: "phone", phone, code } });

export const unlinkAccount = (provider: "email" | "phone" | "google") =>
  apiRequest<{ user: ApiUser }>(`/users/me/linked-accounts/${provider}`, { method: "DELETE" });
