const STORAGE_KEY = "darkline.auth.tokens";

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }));
}

export async function loadTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearTokens(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
}
