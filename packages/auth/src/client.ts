import { clearStoredToken, getStoredToken, setStoredToken } from "./token";
import type {
  AuthClient,
  AuthSession,
  LoginCredentials,
  LoginResult,
  SessionContext
} from "./types";

/** Shared password for every demo persona. */
export const DEMO_PASSWORD = "ginja-ai";

const GINJA_AI_TENANT = {
  id: "tenant-ginja-ai",
  name: "Ginja AI"
} as const;

export interface DemoPersona {
  label: string;
  email: string;
  token: string;
  session: SessionContext;
}

/**
 * The single source of truth for demo credentials. The login page imports
 * this to render quick-fill buttons, and {@link MockAuthClient} validates
 * against it — so the two never drift.
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    label: "Admin",
    email: "admin@example.ginja.ai",
    token: "mock-token-admin",
    session: {
      authenticated: true,
      user: {
        id: "user-demo-admin",
        name: "Demo Admin",
        email: "admin@example.ginja.ai",
        roles: ["platform-admin"],
        permissions: [
          "product-config:view",
          "underwriting:view",
          "settings:view"
        ]
      },
      tenant: GINJA_AI_TENANT
    }
  },
  {
    label: "Underwriter",
    email: "underwriter@example.ginja.ai",
    token: "mock-token-underwriter",
    session: {
      authenticated: true,
      user: {
        id: "user-demo-underwriter",
        name: "Dana Underwriter",
        email: "underwriter@example.ginja.ai",
        roles: ["underwriter"],
        permissions: ["underwriting:view"]
      },
      tenant: GINJA_AI_TENANT
    }
  },
  {
    label: "Product Manager",
    email: "product@example.ginja.ai",
    token: "mock-token-product-manager",
    session: {
      authenticated: true,
      user: {
        id: "user-demo-product-manager",
        name: "Priya Product",
        email: "product@example.ginja.ai",
        roles: ["product-manager"],
        permissions: ["product-config:view"]
      },
      tenant: GINJA_AI_TENANT
    }
  }
];

const SIMULATED_LATENCY_MS = 350;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function personaByEmail(email: string): DemoPersona | undefined {
  const normalized = normalizeEmail(email);
  return DEMO_PERSONAS.find((persona) => persona.email === normalized);
}

function personaByToken(token: string): DemoPersona | undefined {
  return DEMO_PERSONAS.find((persona) => persona.token === token);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * In-memory authentication backend for the prototype. Validates the seeded
 * personas, issues a fake token, and persists it via the token helpers.
 */
export class MockAuthClient implements AuthClient {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    await delay(SIMULATED_LATENCY_MS);

    const persona = personaByEmail(credentials.email);

    if (!persona || credentials.password !== DEMO_PASSWORD) {
      return {
        ok: false,
        error: {
          code: "invalid_credentials",
          message: "Incorrect email or password."
        }
      };
    }

    setStoredToken(persona.token);

    return {
      ok: true,
      data: { token: persona.token, session: persona.session }
    };
  }

  async logout(): Promise<void> {
    clearStoredToken();
  }

  async restoreSession(): Promise<AuthSession | null> {
    const token = getStoredToken();

    if (!token) {
      return null;
    }

    const persona = personaByToken(token);

    // Only clear when a token is present AND maps to no known persona, so a
    // StrictMode double-invocation against a valid token cannot wipe it.
    if (!persona) {
      clearStoredToken();
      return null;
    }

    return { token: persona.token, session: persona.session };
  }
}
