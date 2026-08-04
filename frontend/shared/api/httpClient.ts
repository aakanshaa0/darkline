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

/**
 * Built by hand rather than via `new URL(...).searchParams` — React Native's
 * URL polyfill (Libraries/Blob/URL.js) ships a URLSearchParams whose `set`
 * throws "not implemented", so the URL route threw on every query-param
 * request and callers swallowed it as an empty result.
 */
function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = `${API_BASE_URL}${path}`;
  if (!query) return base;

  const pairs = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return pairs.length > 0 ? `${base}?${pairs.join("&")}` : base;
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
    // VALIDATION_ERROR's top-level message is a generic "Invalid request" — the
    // actionable detail is in `issues` (zod's per-field messages). Surface the
    // first one so the user learns *why*, not just *that* something's wrong.
    const message = err.code === "VALIDATION_ERROR" && err.issues?.[0]?.message ? err.issues[0].message : err.message;
    throw new ApiError(res.status, err.code, message);
  }
  return json as T;
}
