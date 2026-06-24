interface Env {
  ASSETS: Fetcher;
  PLATFORM_SERVICE_BASE_URL?: string;
  PLATFORM_SERVICE_TOKEN?: string;
  REMOTE_ASSET_HOSTS?: string;
}

const shellModulesPath = "/api/v1/platform/shell/modules";
const shellRemoteAssetsPathPrefix = "/api/v1/platform/shell/remote-assets/";
const defaultPlatformServiceBaseUrl =
  "https://ginja-ai-internal-platform-service.onrender.com";
const defaultRemoteAssetHosts = ["pub-f35ff9bec2444061aa85868ea31d7776.r2.dev"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === shellModulesPath) {
      return proxyShellModules(request, env);
    }

    if (url.pathname.startsWith(shellRemoteAssetsPathPrefix)) {
      return proxyRemoteAsset(request, url, env);
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;

async function proxyShellModules(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      headers: {
        Allow: "GET, HEAD"
      },
      status: 405
    });
  }

  const token = env.PLATFORM_SERVICE_TOKEN?.trim();

  if (!token) {
    return new Response("PLATFORM_SERVICE_TOKEN is not configured.", {
      status: 500
    });
  }

  const upstreamUrl = new URL(
    shellModulesPath,
    normalizeBaseUrl(env.PLATFORM_SERVICE_BASE_URL ?? defaultPlatformServiceBaseUrl)
  );
  const response = await fetch(upstreamUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    },
    method: request.method
  });
  const headers = new Headers(response.headers);

  headers.set("Cache-Control", "no-store");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  });
}

async function proxyRemoteAsset(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      headers: {
        Allow: "GET, HEAD"
      },
      status: 405
    });
  }

  const remoteAssetRequest = parseRemoteAssetRequest(url, env);

  if (!remoteAssetRequest) {
    return new Response("Not Found", { status: 404 });
  }

  const upstreamUrl = new URL(
    remoteAssetRequest.assetPath === "remoteEntry.js"
      ? "entry/remoteEntry.js"
      : `static/${remoteAssetRequest.assetPath}`,
    `${normalizeBaseUrl(remoteAssetRequest.assetBaseUrl)}/`
  );
  const response = await fetch(upstreamUrl, {
    method: request.method
  });
  const headers = new Headers(response.headers);
  const contentType = getContentType(remoteAssetRequest.assetPath);

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(request.method === "HEAD" ? null : response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  });
}

function parseRemoteAssetRequest(
  url: URL,
  env: Env
): { assetBaseUrl: string; assetPath: string } | null {
  const path = url.pathname.slice(shellRemoteAssetsPathPrefix.length);
  const separatorIndex = path.indexOf("/");

  if (separatorIndex < 0) {
    return null;
  }

  const encodedAssetBaseUrl = path.slice(0, separatorIndex);
  const assetPath = path.slice(separatorIndex + 1);

  if (!encodedAssetBaseUrl || !assetPath || hasUnsafePathSegment(assetPath)) {
    return null;
  }

  try {
    const assetBaseUrl = decodeURIComponent(encodedAssetBaseUrl);
    const parsedAssetBaseUrl = new URL(assetBaseUrl);

    if (!["http:", "https:"].includes(parsedAssetBaseUrl.protocol)) {
      return null;
    }

    if (!getAllowedRemoteAssetHosts(env).has(parsedAssetBaseUrl.hostname)) {
      return null;
    }

    return { assetBaseUrl, assetPath };
  } catch {
    return null;
  }
}

function getAllowedRemoteAssetHosts(env: Env): Set<string> {
  const configuredHosts = env.REMOTE_ASSET_HOSTS?.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return new Set(
    configuredHosts && configuredHosts.length > 0
      ? configuredHosts
      : defaultRemoteAssetHosts
  );
}

function hasUnsafePathSegment(pathname: string): boolean {
  return pathname.split("/").some((segment) => segment === "..");
}

function getContentType(pathname: string): string | undefined {
  if (pathname.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (pathname.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (pathname.endsWith(".woff2")) {
    return "font/woff2";
  }

  if (pathname.endsWith(".ico")) {
    return "image/x-icon";
  }

  if (pathname.endsWith(".png")) {
    return "image/png";
  }

  if (pathname.endsWith(".svg")) {
    return "image/svg+xml";
  }

  if (pathname.endsWith(".txt")) {
    return "text/plain; charset=utf-8";
  }

  return undefined;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}
