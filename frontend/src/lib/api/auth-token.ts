const STORAGE_KEY = "crm_access_token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getCookieToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${STORAGE_KEY}=`));
  if (!match) {
    return null;
  }
  const value = match.split("=").slice(1).join("=");
  return value ? decodeURIComponent(value) : null;
}

/** Bearer token for API calls — localStorage first, then dev env fallback. */
export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const cookieToken = getCookieToken();
    if (cookieToken) {
      return cookieToken;
    }
  }
  return process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN ?? null;
}

export function setAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, token);
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
