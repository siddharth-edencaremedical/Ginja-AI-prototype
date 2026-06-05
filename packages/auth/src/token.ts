export const AUTH_TOKEN_STORAGE_KEY = "ginja.auth.token";

/**
 * Returns localStorage when it is available, or null in SSR / sandboxed
 * environments where touching `window.localStorage` would throw.
 */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Module-level token accessor consumed by the api-client outside of React,
 * e.g. `createApiClient({ getAccessToken: getStoredToken })`. Reads one
 * consistent value across shell + remotes because `@ginja/auth` is a
 * Module Federation shared singleton.
 */
export function getStoredToken(): string | undefined {
  return safeStorage()?.getItem(AUTH_TOKEN_STORAGE_KEY) ?? undefined;
}

export function setStoredToken(token: string): void {
  safeStorage()?.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  safeStorage()?.removeItem(AUTH_TOKEN_STORAGE_KEY);
}
