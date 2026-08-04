import { apiRequest } from "./httpClient";
import type { ApiCall } from "./types";

export const createCall = (input: { conversationId: string; kind: ApiCall["kind"]; mode: ApiCall["mode"]; participantIds: string[] }) =>
  apiRequest<{ call: ApiCall }>("/calls", { method: "POST", body: input });

export const updateCall = (id: string, input: { status: "missed" | "declined" | "completed"; durationSec?: number }) =>
  apiRequest<{ call: ApiCall }>(`/calls/${id}`, { method: "PATCH", body: input });

export const getIceServers = () =>
  apiRequest<{ iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> }>(
    "/calls/ice-servers",
  );

export const listCalls = (params?: { limit?: number; before?: string }) =>
  apiRequest<{ calls: ApiCall[] }>("/calls", { query: params });
