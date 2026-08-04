import { apiRequest } from "./httpClient";
import type { PresenceDto } from "./types";

export const getPresence = (userId: string) => apiRequest<PresenceDto>(`/presence/${userId}`);
