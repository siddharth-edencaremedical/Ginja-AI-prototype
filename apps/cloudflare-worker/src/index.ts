interface Env {
  ASSETS: Fetcher;
  PLATFORM_SERVICE_BASE_URL?: string;
  PLATFORM_SERVICE_TOKEN?: string;
}

const shellModulesPath = "/api/v1/platform/shell/modules";
const defaultPlatformServiceBaseUrl =
  "https://ginja-ai-internal-platform-service.onrender.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === shellModulesPath) {
      return proxyShellModules(request, env);
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

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}
