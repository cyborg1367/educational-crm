const STORAGE_KEY = "crm_access_token";

/** Bearer token for API calls — localStorage first, then dev env fallback. */
export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
  }
  return process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN ?? null;
}

export function setAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, token);
  }
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
