import {
  REMOTE_MODULE_CONTRACT_VERSION,
  type RemoteRegistryItem,
  type RemoteRegistryResponse
} from "@ginja/shared-types";

const DEFAULT_REGISTRY_ENVIRONMENT = "development";
const STUB_SESSION_COOKIE_NAME = "ginja.stub.session";
const RELEASE_PREVIEW_HEADER = "X-Ginja-Release-Preview";
const RELEASE_PREVIEW_PERMISSION = "settings:view";

interface Env {
  ASSETS: Fetcher;
  REMOTE_ARTIFACTS: R2Bucket;
  REMOTE_REGISTRY: D1Database;
  REGISTRY_ENVIRONMENT?: string;
  SESSION_VALIDATION_URL?: string;
}

interface AuthenticatedSession {
  source: "backend" | "demo";
  token?: string;
  userId: string;
  tenantId: string;
  permissions: string[];
}

interface DemoSession {
  token: string;
  userId: string;
  tenantId: string;
  permissions: string[];
}

interface RemoteAssetRequest {
  remoteId: string;
  version: string;
  filePath: string;
}

interface RemoteRegistryRow {
  id: string;
  displayName: string;
  routeBasePath: string;
  scopeClassName: string;
  remoteName: string;
  requiredPermissionsJson: string;
  featureFlagsJson: string | null;
  version: string;
  r2Prefix: string;
  contractVersion: number;
  minShellVersion: string | null;
  builtAt: string;
  gitSha: string;
}

interface ActiveRemote {
  registryItem: RemoteRegistryItem;
  r2Prefix: string;
}

const demoSessionsByToken: Record<string, DemoSession> = {
  "mock-token-admin": {
    token: "mock-token-admin",
    userId: "user-demo-admin",
    tenantId: "tenant-ginja-ai",
    permissions: ["product-config:view", "underwriting:view", "settings:view"]
  },
  "mock-token-product-manager": {
    token: "mock-token-product-manager",
    userId: "user-demo-product-manager",
    tenantId: "tenant-ginja-ai",
    permissions: ["product-config:view"]
  },
  "mock-token-underwriter": {
    token: "mock-token-underwriter",
    userId: "user-demo-underwriter",
    tenantId: "tenant-ginja-ai",
    permissions: ["underwriting:view"]
  }
};

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

async function handleRuntimeRemoteRegistry(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const session = await validateSession(request, env);

  if (!session) {
    return unauthorized();
  }

  try {
    const activeRemotes = await getActiveRemoteRegistry(
      env.REMOTE_REGISTRY,
      getRegistryEnvironment(env),
      session.tenantId
    );
    const responseBody: RemoteRegistryResponse = {
      remotes: activeRemotes
        .map((remote) => remote.registryItem)
        .filter((remote) =>
          hasEveryPermission(session.permissions, remote.requiredPermissions)
        )
    };
    const headers = noStoreHeaders();

    if (session.source === "demo" && session.token) {
      headers.append("Set-Cookie", createStubSessionCookie(request, session.token));
    }

    return jsonResponse(responseBody, { headers });
  } catch (error) {
    console.error("Runtime remote registry unavailable", error);
    return serviceUnavailable("Runtime remote registry is unavailable.");
  }
}

async function handleRemoteAsset(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowed(["GET", "HEAD"]);
  }

  const assetRequest = parseRemoteAssetPath(url.pathname);

  if (!assetRequest || isDeniedRemoteAssetPath(assetRequest.filePath)) {
    return notFound();
  }

  let release: ActiveRemote | null;

  try {
    release = await getRemoteRelease(
      env.REMOTE_REGISTRY,
      assetRequest.remoteId,
      assetRequest.version
    );
  } catch (error) {
    console.error("Remote release lookup failed", error);
    return serviceUnavailable("Remote asset registry is unavailable.");
  }

  if (!release) {
    return notFound();
  }

  const session = await validateSession(request, env);

  if (!session) {
    return unauthorized();
  }

  if (
    !hasEveryPermission(
      session.permissions,
      release.registryItem.requiredPermissions
    )
  ) {
    return forbidden(`The current session cannot access "${assetRequest.remoteId}".`);
  }

  try {
    const activeRelease = await getActiveRemoteRelease(
      env.REMOTE_REGISTRY,
      getRegistryEnvironment(env),
      session.tenantId,
      assetRequest.remoteId,
      assetRequest.version
    );

    if (!activeRelease && !canPreviewRemoteRelease(request, session)) {
      return notFound();
    }

    return serveRemoteAssetFromR2(request, env.REMOTE_ARTIFACTS, {
      filePath: assetRequest.filePath,
      r2Key: joinR2Key(
        (activeRelease ?? release).r2Prefix,
        assetRequest.filePath
      )
    });
  } catch (error) {
    console.error("Remote asset fetch failed", error);
    return serviceUnavailable("Remote asset storage is unavailable.");
  }
}

async function serveRemoteAssetFromR2(
  request: Request,
  bucket: R2Bucket,
  asset: { filePath: string; r2Key: string }
): Promise<Response> {
  if (request.method === "HEAD") {
    const object = await bucket.head(asset.r2Key);

    if (!object) {
      return notFound();
    }

    return new Response(null, {
      headers: createRemoteAssetHeaders(object, asset.filePath)
    });
  }

  const object = await bucket.get(asset.r2Key);

  if (!object) {
    return notFound();
  }

  return new Response(object.body, {
    headers: createRemoteAssetHeaders(object, asset.filePath)
  });
}

async function getActiveRemoteRegistry(
  db: D1Database,
  environment: string,
  tenantId: string
): Promise<ActiveRemote[]> {
  const result = await db
    .prepare(
      `
      WITH chosen_activations AS (
        SELECT ra.remote_id, ra.active_version
        FROM remote_activations ra
        WHERE ra.environment = ?
          AND ra.tenant_id IN (?, '*')
          AND NOT (
            ra.tenant_id = '*'
            AND EXISTS (
              SELECT 1
              FROM remote_activations exact
              WHERE exact.environment = ra.environment
                AND exact.remote_id = ra.remote_id
                AND exact.tenant_id = ?
            )
          )
      )
      SELECT
        rm.remote_id AS id,
        rm.display_name AS displayName,
        rm.route_base_path AS routeBasePath,
        rm.scope_class_name AS scopeClassName,
        rm.remote_name AS remoteName,
        rm.required_permissions_json AS requiredPermissionsJson,
        rm.feature_flags_json AS featureFlagsJson,
        rr.version AS version,
        rr.r2_prefix AS r2Prefix,
        rr.contract_version AS contractVersion,
        rr.min_shell_version AS minShellVersion,
        rr.built_at AS builtAt,
        rr.git_sha AS gitSha
      FROM remote_modules rm
      JOIN chosen_activations ca ON ca.remote_id = rm.remote_id
      JOIN remote_releases rr
        ON rr.remote_id = ca.remote_id
       AND rr.version = ca.active_version
      WHERE rm.enabled = 1
        AND rr.status IN ('available', 'active')
      ORDER BY rm.display_order ASC, rm.remote_id ASC
      `
    )
    .bind(environment, tenantId, tenantId)
    .all<RemoteRegistryRow>();

  return result.results.map(toActiveRemote);
}

async function getRemoteRelease(
  db: D1Database,
  remoteId: string,
  version: string
): Promise<ActiveRemote | null> {
  const row = await db
    .prepare(
      `
      SELECT
        rm.remote_id AS id,
        rm.display_name AS displayName,
        rm.route_base_path AS routeBasePath,
        rm.scope_class_name AS scopeClassName,
        rm.remote_name AS remoteName,
        rm.required_permissions_json AS requiredPermissionsJson,
        rm.feature_flags_json AS featureFlagsJson,
        rr.version AS version,
        rr.r2_prefix AS r2Prefix,
        rr.contract_version AS contractVersion,
        rr.min_shell_version AS minShellVersion,
        rr.built_at AS builtAt,
        rr.git_sha AS gitSha
      FROM remote_modules rm
      JOIN remote_releases rr ON rr.remote_id = rm.remote_id
      WHERE rm.remote_id = ?
        AND rm.enabled = 1
        AND rr.version = ?
        AND rr.status IN ('available', 'active')
      LIMIT 1
      `
    )
    .bind(remoteId, version)
    .first<RemoteRegistryRow>();

  return row ? toActiveRemote(row) : null;
}

async function getActiveRemoteRelease(
  db: D1Database,
  environment: string,
  tenantId: string,
  remoteId: string,
  version: string
): Promise<ActiveRemote | null> {
  const row = await db
    .prepare(
      `
      WITH chosen_activation AS (
        SELECT active_version
        FROM remote_activations
        WHERE environment = ?
          AND remote_id = ?
          AND tenant_id IN (?, '*')
        ORDER BY CASE WHEN tenant_id = ? THEN 0 ELSE 1 END
        LIMIT 1
      )
      SELECT
        rm.remote_id AS id,
        rm.display_name AS displayName,
        rm.route_base_path AS routeBasePath,
        rm.scope_class_name AS scopeClassName,
        rm.remote_name AS remoteName,
        rm.required_permissions_json AS requiredPermissionsJson,
        rm.feature_flags_json AS featureFlagsJson,
        rr.version AS version,
        rr.r2_prefix AS r2Prefix,
        rr.contract_version AS contractVersion,
        rr.min_shell_version AS minShellVersion,
        rr.built_at AS builtAt,
        rr.git_sha AS gitSha
      FROM remote_modules rm
      CROSS JOIN chosen_activation ca
      JOIN remote_releases rr
        ON rr.remote_id = rm.remote_id
       AND rr.version = ca.active_version
      WHERE rm.remote_id = ?
        AND rm.enabled = 1
        AND rr.version = ?
        AND rr.status IN ('available', 'active')
      LIMIT 1
      `
    )
    .bind(environment, remoteId, tenantId, tenantId, remoteId, version)
    .first<RemoteRegistryRow>();

  return row ? toActiveRemote(row) : null;
}

function toActiveRemote(row: RemoteRegistryRow): ActiveRemote {
  const requiredPermissions = parseStringArrayJson(
    row.requiredPermissionsJson,
    `required permissions for ${row.id}`
  );
  const featureFlags = row.featureFlagsJson
    ? parseStringArrayJson(row.featureFlagsJson, `feature flags for ${row.id}`)
    : undefined;
  const registryItem: RemoteRegistryItem = {
    id: row.id,
    displayName: row.displayName,
    routeBasePath: toRouteBasePath(row.routeBasePath),
    scopeClassName: row.scopeClassName,
    remoteName: row.remoteName,
    remoteEntryUrl: `/remote-assets/${row.id}/releases/${row.version}/remoteEntry.js`,
    requiredPermissions,
    version: row.version,
    contractVersion: toSupportedContractVersion(row.contractVersion, row.id),
    builtAt: row.builtAt,
    gitSha: row.gitSha
  };

  if (featureFlags && featureFlags.length > 0) {
    registryItem.featureFlags = featureFlags;
  }

  if (row.minShellVersion) {
    registryItem.minShellVersion = row.minShellVersion;
  }

  return {
    registryItem,
    r2Prefix: normalizeR2Prefix(row.r2Prefix, row.id)
  };
}

async function validateSession(
  request: Request,
  env: Env
): Promise<AuthenticatedSession | null> {
  if (env.SESSION_VALIDATION_URL) {
    return validateBackendSession(request, env.SESSION_VALIDATION_URL);
  }

  const demoSession = getDemoSession(request);

  return demoSession
    ? {
        ...demoSession,
        source: "demo"
      }
    : null;
}

async function validateBackendSession(
  request: Request,
  validationUrl: string
): Promise<AuthenticatedSession | null> {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const authorization = request.headers.get("Authorization");
  const cookie = request.headers.get("Cookie");

  if (authorization) {
    headers.set("Authorization", authorization);
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(validationUrl, { headers });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Session validation service returned ${response.status} ${response.statusText}.`
    );
  }

  const payload = await response.json();
  const session = readBackendSessionPayload(payload);

  return session
    ? {
        ...session,
        source: "backend"
      }
    : null;
}

function readBackendSessionPayload(
  payload: unknown
): Omit<AuthenticatedSession, "source"> | null {
  const sessionPayload =
    isRecord(payload) && isRecord(payload.session) ? payload.session : payload;

  if (!isRecord(sessionPayload)) {
    return null;
  }

  const user = isRecord(sessionPayload.user) ? sessionPayload.user : null;
  const tenant = isRecord(sessionPayload.tenant) ? sessionPayload.tenant : null;

  if (sessionPayload.authenticated !== true || !user || !tenant) {
    return null;
  }

  const userId = typeof user.id === "string" ? user.id : undefined;
  const tenantId = typeof tenant.id === "string" ? tenant.id : undefined;
  const permissions = Array.isArray(user.permissions)
    ? user.permissions.filter((permission) => typeof permission === "string")
    : undefined;

  if (!userId || !tenantId || !permissions) {
    return null;
  }

  return {
    userId,
    tenantId,
    permissions
  };
}

function getDemoSession(request: Request): DemoSession | null {
  const token =
    getBearerToken(request.headers.get("Authorization")) ??
    parseCookies(request.headers.get("Cookie"))[STUB_SESSION_COOKIE_NAME];

  return token ? demoSessionsByToken[token] ?? null : null;
}

function parseRemoteAssetPath(pathname: string): RemoteAssetRequest | null {
  const parts = pathname.split("/");
  const remoteId = decodePathSegment(parts[2] ?? "");
  const releaseSegment = decodePathSegment(parts[3] ?? "");
  const version = decodePathSegment(parts[4] ?? "");
  const fileSegments = parts.slice(5).map(decodePathSegment);

  if (
    parts[1] !== "remote-assets" ||
    releaseSegment !== "releases" ||
    !remoteId ||
    !version ||
    fileSegments.length === 0 ||
    fileSegments.some((part) => !part || part === "." || part === "..")
  ) {
    return null;
  }

  return {
    remoteId,
    version,
    filePath: fileSegments.join("/")
  };
}

function decodePathSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.includes("/") || decoded.includes("\\") ? null : decoded;
  } catch {
    return null;
  }
}

function isDeniedRemoteAssetPath(filePath: string): boolean {
  return (
    filePath === "index.html" ||
    filePath.endsWith("/index.html") ||
    filePath.endsWith(".html")
  );
}

function joinR2Key(prefix: string, filePath: string): string {
  return `${prefix.replace(/\/+$/, "")}/${filePath.replace(/^\/+/, "")}`;
}

function createRemoteAssetHeaders(object: R2Object, filePath: string): Headers {
  const headers = new Headers();

  object.writeHttpMetadata(headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", getContentType(filePath));
  }

  headers.set("Cache-Control", getRemoteAssetCacheControl(filePath));
  headers.set("Content-Length", String(object.size));
  headers.set("ETag", object.httpEtag);
  headers.set("Last-Modified", object.uploaded.toUTCString());
  headers.set("X-Content-Type-Options", "nosniff");

  return headers;
}

function getRemoteAssetCacheControl(filePath: string): string {
  if (filePath === "remoteEntry.js") {
    return "no-store";
  }

  return "private, max-age=31536000, immutable";
}

function getContentType(filePath: string): string {
  const extension = filePath.toLowerCase().split(".").pop();

  switch (extension) {
    case "css":
      return "text/css; charset=utf-8";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "js":
    case "mjs":
      return "text/javascript; charset=utf-8";
    case "json":
    case "map":
      return "application/json; charset=utf-8";
    case "otf":
      return "font/otf";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "ttf":
      return "font/ttf";
    case "webp":
      return "image/webp";
    case "woff":
      return "font/woff";
    case "woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function toRouteBasePath(value: string): `/${string}` {
  if (!value.startsWith("/")) {
    throw new Error(`Route base path "${value}" must start with "/".`);
  }

  return value as `/${string}`;
}

function toSupportedContractVersion(value: number, remoteId: string): number {
  if (value !== REMOTE_MODULE_CONTRACT_VERSION) {
    throw new Error(
      `Remote "${remoteId}" contract version ${value} is not supported.`
    );
  }

  return value;
}

function normalizeR2Prefix(value: string, remoteId: string): string {
  const prefix = value.replace(/^\/+|\/+$/g, "");

  if (
    !prefix ||
    prefix
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Remote "${remoteId}" has an invalid R2 prefix.`);
  }

  return prefix;
}

function parseStringArrayJson(value: string, label: string): string[] {
  const parsed = JSON.parse(value) as unknown;

  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error(`Expected ${label} to be a JSON string array.`);
  }

  return parsed;
}

function hasEveryPermission(
  availablePermissions: readonly string[],
  requiredPermissions: readonly string[]
): boolean {
  return requiredPermissions.every((permission) =>
    availablePermissions.includes(permission)
  );
}

function canPreviewRemoteRelease(
  request: Request,
  session: AuthenticatedSession
): boolean {
  return (
    request.headers.get(RELEASE_PREVIEW_HEADER) === "1" &&
    session.permissions.includes(RELEASE_PREVIEW_PERMISSION)
  );
}

function getRegistryEnvironment(env: Env): string {
  return env.REGISTRY_ENVIRONMENT ?? DEFAULT_REGISTRY_ENVIRONMENT;
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

function noStoreHeaders(): Headers {
  return new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
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

function unauthorized(): Response {
  return jsonResponse(
    { error: "unauthorized", message: "An authenticated session is required." },
    { status: 401, headers: noStoreHeaders() }
  );
}

function forbidden(message: string): Response {
  return jsonResponse(
    { error: "forbidden", message },
    { status: 403, headers: noStoreHeaders() }
  );
}

function notFound(): Response {
  return jsonResponse(
    { error: "not_found", message: "The requested resource was not found." },
    { status: 404, headers: noStoreHeaders() }
  );
}

function serviceUnavailable(message: string): Response {
  return jsonResponse(
    { error: "service_unavailable", message },
    { status: 503, headers: noStoreHeaders() }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
