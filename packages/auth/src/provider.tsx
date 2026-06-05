import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { MockAuthClient } from "./client";
import { clearStoredToken } from "./token";
import type {
  AuthClient,
  AuthContextValue,
  AuthProviderProps,
  AuthStatus,
  AuthUser,
  LoginCredentials,
  LoginResult,
  SessionContext
} from "./types";

const ANONYMOUS_USER: AuthUser = {
  id: "anonymous",
  name: "Guest",
  email: "",
  roles: [],
  permissions: []
};

/**
 * Logged-out state as a real (non-null) SessionContext. Keeping `user` and
 * `tenant` non-null is what lets existing consumers — which call
 * `hasEveryPermission(session.user, …)` and read `session.tenant.name` —
 * keep working without any type or code changes.
 */
export const anonymousSession: SessionContext = {
  authenticated: false,
  user: ANONYMOUS_USER,
  tenant: {
    id: "tenant-ginja-ai",
    name: "Ginja AI"
  }
};

/**
 * Back-compat alias. Historically this was an authenticated admin and the
 * default context value; it now points at the anonymous session, so the app
 * starts logged out. No runtime consumer imports it today.
 */
export const defaultSession: SessionContext = anonymousSession;

const AuthContext = createContext<AuthContextValue>({
  status: "unauthenticated",
  loading: false,
  session: anonymousSession,
  user: anonymousSession.user,
  tenant: anonymousSession.tenant,
  login: async () => ({
    ok: false,
    error: { code: "unknown", message: "AuthProvider is not mounted." }
  }),
  logout: async () => {
    /* no-op default until AuthProvider is mounted */
  }
});

export function AuthProvider({
  children,
  client,
  session: forcedSession
}: AuthProviderProps) {
  const clientRef = useRef<AuthClient>(client ?? new MockAuthClient());

  const [session, setSession] = useState<SessionContext>(
    forcedSession ?? anonymousSession
  );
  const [status, setStatus] = useState<AuthStatus>(
    forcedSession ? "authenticated" : "unknown"
  );

  useEffect(() => {
    // A forced session (standalone dev / SSR) is authoritative — skip restore.
    if (forcedSession) {
      return;
    }

    let cancelled = false;

    clientRef.current
      .restoreSession()
      .then((restored) => {
        if (cancelled) {
          return;
        }

        if (restored) {
          setSession(restored.session);
          setStatus("authenticated");
        } else {
          setSession(anonymousSession);
          setStatus("unauthenticated");
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setSession(anonymousSession);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, [forcedSession]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResult> => {
      const result = await clientRef.current.login(credentials);

      if (result.ok) {
        setSession(result.data.session);
        setStatus("authenticated");
      }

      return result;
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    await clientRef.current.logout();
    clearStoredToken();
    setSession(anonymousSession);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      loading: status === "unknown",
      session,
      user: session.user,
      tenant: session.tenant,
      login,
      logout
    }),
    [login, logout, session, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function useSession(): SessionContext {
  return useAuth().session;
}

export function useCurrentUser(): AuthUser {
  return useAuth().session.user;
}
