import type {
  RemoteRegistryItem,
  RemoteRegistryResponse
} from "@ginja/shared-types";

const REMOTE_MODULE_CONTRACT_VERSION = 1;
const DEFAULT_STUB_RELEASE_VERSION = "2026.06.08-step3";
const STUB_BUILT_AT = "2026-06-08T00:00:00.000Z";
const STUB_GIT_SHA = "step3-worker";
const STUB_SESSION_COOKIE_NAME = "ginja.stub.session";

interface Env {
  ASSETS: Fetcher;
  PRODUCT_CONFIG_REMOTE_VERSION?: string;
  UNDERWRITING_REMOTE_VERSION?: string;
}

interface StubSession {
  token: string;
  permissions: string[];
}

interface RemoteDefinition {
  id: string;
  displayName: string;
  routeBasePath: `/${string}`;
  scopeClassName: string;
  remoteName: string;
  requiredPermissions: string[];
  versionEnvKey: "PRODUCT_CONFIG_REMOTE_VERSION" | "UNDERWRITING_REMOTE_VERSION";
}

interface RemoteAssetRequest {
  remoteId: string;
  version: string;
  filePath: string;
}

const demoSessionsByToken: Record<string, StubSession> = {
  "mock-token-admin": {
    token: "mock-token-admin",
    permissions: ["product-config:view", "underwriting:view", "settings:view"]
  },
  "mock-token-product-manager": {
    token: "mock-token-product-manager",
    permissions: ["product-config:view"]
  },
  "mock-token-underwriter": {
    token: "mock-token-underwriter",
    permissions: ["underwriting:view"]
  }
};

const remoteDefinitions: RemoteDefinition[] = [
  {
    id: "product-config",
    displayName: "Product Config",
    routeBasePath: "/product-config",
    scopeClassName: "product-config-remote",
    remoteName: "product_config",
    requiredPermissions: ["product-config:view"],
    versionEnvKey: "PRODUCT_CONFIG_REMOTE_VERSION"
  },
  {
    id: "underwriting",
    displayName: "Underwriting",
    routeBasePath: "/underwriting",
    scopeClassName: "underwriting-remote",
    remoteName: "underwriting",
    requiredPermissions: ["underwriting:view"],
    versionEnvKey: "UNDERWRITING_REMOTE_VERSION"
  }
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/runtime/remotes") {
      return handleRuntimeRemoteRegistry(request, env);
    }

    if (url.pathname.startsWith("/remote-assets/")) {
      return handleRemoteAsset(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;

function handleRuntimeRemoteRegistry(request: Request, env: Env): Response {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const session = getStubSession(request);

  if (!session) {
    return jsonResponse(
      { error: "unauthorized", message: "A demo session is required." },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  const responseBody: RemoteRegistryResponse = {
    remotes: remoteDefinitions
      .filter((remote) =>
        hasEveryPermission(session.permissions, remote.requiredPermissions)
      )
      .map((remote) => toRegistryItem(remote, getRemoteVersion(remote, env)))
  };

  const headers = noStoreHeaders();
  headers.append("Set-Cookie", createStubSessionCookie(request, session.token));

  return jsonResponse(responseBody, { headers });
}

function handleRemoteAsset(
  request: Request,
  env: Env,
  url: URL
): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowed(["GET", "HEAD"]);
  }

  const assetRequest = parseRemoteAssetPath(url.pathname);

  if (!assetRequest) {
    return notFound();
  }

  const remote = remoteDefinitions.find(
    (definition) => definition.id === assetRequest.remoteId
  );

  if (!remote) {
    return notFound();
  }

  if (assetRequest.filePath === "index.html") {
    return notFound();
  }

  if (assetRequest.version !== getRemoteVersion(remote, env)) {
    return notFound();
  }

  const session = getStubSession(request);

  if (!session) {
    return jsonResponse(
      { error: "unauthorized", message: "A demo session is required." },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  if (!hasEveryPermission(session.permissions, remote.requiredPermissions)) {
    return jsonResponse(
      {
        error: "forbidden",
        message: `The demo session cannot access "${remote.id}".`
      },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  const headers = noStoreHeaders();

  if (request.method === "HEAD") {
    return new Response(null, { status: 501, headers });
  }

  return jsonResponse(
    {
      error: "remote_assets_not_wired",
      message:
        "The Cloudflare Worker remote asset gateway is stubbed until R2 is wired in Step 4.",
      remoteId: remote.id,
      version: assetRequest.version,
      filePath: assetRequest.filePath
    },
    { status: 501, headers }
  );
}

function toRegistryItem(
  remote: RemoteDefinition,
  version: string
): RemoteRegistryItem {
  return {
    id: remote.id,
    displayName: remote.displayName,
    routeBasePath: remote.routeBasePath,
    scopeClassName: remote.scopeClassName,
    remoteName: remote.remoteName,
    remoteEntryUrl: `/remote-assets/${remote.id}/releases/${version}/remoteEntry.js`,
    requiredPermissions: remote.requiredPermissions,
    version,
    contractVersion: REMOTE_MODULE_CONTRACT_VERSION,
    builtAt: STUB_BUILT_AT,
    gitSha: STUB_GIT_SHA
  };
}

function parseRemoteAssetPath(pathname: string): RemoteAssetRequest | null {
  const parts = pathname.split("/");
  const remoteId = parts[2] ?? "";
  const releaseSegment = parts[3] ?? "";
  const version = parts[4] ?? "";
  const filePath = parts.slice(5).join("/");

  if (
    parts[1] !== "remote-assets" ||
    releaseSegment !== "releases" ||
    remoteId.length === 0 ||
    version.length === 0 ||
    filePath.length === 0
  ) {
    return null;
  }

  return { remoteId, version, filePath };
}

function getStubSession(request: Request): StubSession | null {
  const token =
    getBearerToken(request.headers.get("Authorization")) ??
    parseCookies(request.headers.get("Cookie"))[STUB_SESSION_COOKIE_NAME];

  return token ? demoSessionsByToken[token] ?? null : null;
}

function getBearerToken(authorization: string | null): string | undefined {
  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter((cookie) => cookie.length > 0)
      .map((cookie) => {
        const [name = "", ...valueParts] = cookie.split("=");
        return [
          decodeCookieComponent(name),
          decodeCookieComponent(valueParts.join("="))
        ];
      })
  );
}

function decodeCookieComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function createStubSessionCookie(request: Request, token: string): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";

  return `${STUB_SESSION_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600${secure}`;
}

function getRemoteVersion(remote: RemoteDefinition, env: Env): string {
  return env[remote.versionEnvKey] ?? DEFAULT_STUB_RELEASE_VERSION;
}

function hasEveryPermission(
  availablePermissions: readonly string[],
  requiredPermissions: readonly string[]
): boolean {
  return requiredPermissions.every((permission) =>
    availablePermissions.includes(permission)
  );
}

function noStoreHeaders(): Headers {
  return new Headers({ "Cache-Control": "no-store" });
}

function methodNotAllowed(allowedMethods: string[]): Response {
  return jsonResponse(
    {
      error: "method_not_allowed",
      message: `Allowed methods: ${allowedMethods.join(", ")}.`
    },
    {
      status: 405,
      headers: {
        Allow: allowedMethods.join(", "),
        "Cache-Control": "no-store"
      }
    }
  );
}

function notFound(): Response {
  return jsonResponse(
    { error: "not_found", message: "The requested resource was not found." },
    { status: 404, headers: noStoreHeaders() }
  );
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers
  });
}
