import type { ReactNode } from "react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface TenantContext {
  id: string;
  name: string;
}

export interface SessionContext {
  authenticated: boolean;
  user: AuthUser;
  tenant: TenantContext;
}

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export interface LoginCredentials {
  email: string;
  password: string;
}

export type AuthErrorCode = "invalid_credentials" | "network" | "unknown";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export interface AuthSession {
  token: string;
  session: SessionContext;
}

/**
 * Result of a login attempt. Bad credentials resolve `{ ok: false }` rather
 * than rejecting, so callers branch on `result.ok` instead of try/catch.
 */
export type LoginResult =
  | { ok: true; data: AuthSession }
  | { ok: false; error: AuthError };

/**
 * Pluggable authentication backend. The shipped implementation is an
 * in-memory mock ({@link MockAuthClient}); a real OIDC/HTTP client can be
 * dropped in via `<AuthProvider client={…} />` with zero UI changes.
 */
export interface AuthClient {
  login(credentials: LoginCredentials): Promise<LoginResult>;
  logout(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
}

export interface AuthContextValue {
  status: AuthStatus;
  loading: boolean;
  session: SessionContext;
  user: AuthUser;
  tenant: TenantContext;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  client?: AuthClient;
  /**
   * Escape hatch that forces a session and skips restore — used for
   * standalone remote dev and SSR/story rendering.
   */
  session?: SessionContext;
}
