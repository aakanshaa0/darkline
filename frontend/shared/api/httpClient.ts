import { API_BASE_URL } from "./config";
import { loadTokens, saveTokens, clearTokens } from "./tokenStore";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** POST /auth/* calls that must not attempt a refresh-and-retry on 401 (they'd loop). */
  skipAuthRetry?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });
  if (!res.ok) {
    await clearTokens();
    return null;
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  await saveTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tokens = await loadTokens();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;

  const url = buildUrl(path, options.query);
  const doFetch = () =>
    fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && tokens && !options.skipAuthRetry) {
    if (!refreshInFlight) refreshInFlight = refreshAccessToken().finally(() => (refreshInFlight = null));
    const newAccessToken = await refreshInFlight;
    if (newAccessToken) {
      headers.Authorization = `Bearer ${newAccessToken}`;
      res = await doFetch();
    }
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json?.error ?? { code: "UNKNOWN", message: res.statusText };
    throw new ApiError(res.status, err.code, err.message);
  }
  return json as T;
}
