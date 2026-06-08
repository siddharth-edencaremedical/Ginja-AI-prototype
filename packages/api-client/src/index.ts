export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

/**
 * Resolved per-request context handed to a transport. The auth token is
 * resolved by {@link ApiClient} (awaiting `getAccessToken`) so transports
 * stay synchronous about where the token comes from.
 */
export interface TransportContext {
  baseUrl?: string;
  token?: string;
}

export type Transport = <T>(
  request: ApiRequest,
  context: TransportContext
) => Promise<T>;

export interface ApiClientConfig {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
  transport?: Transport;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  constructor(private readonly config: ApiClientConfig = {}) {}

  async request<T>(request: ApiRequest): Promise<T> {
    if (!this.config.transport) {
      throw new ApiError(
        `No API transport configured for ${request.method} ${request.path}`
      );
    }

    const token = this.config.getAccessToken
      ? await this.config.getAccessToken()
      : undefined;

    return this.config.transport<T>(request, {
      baseUrl: this.config.baseUrl,
      token
    });
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>({ method: "GET", path });
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>({ method: "POST", path, body });
  }
}

export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

/**
 * Real HTTP transport. Attaches `Authorization: Bearer <token>` only when a
 * token is present, so an unauthenticated request never sends "Bearer
 * undefined".
 */
export function createFetchTransport(): Transport {
  return async <T>(
    request: ApiRequest,
    context: TransportContext
  ): Promise<T> => {
    const headers = new Headers({ "Content-Type": "application/json" });

    if (context.token) {
      headers.set("Authorization", `Bearer ${context.token}`);
    }

    const response = await fetch(`${context.baseUrl ?? ""}${request.path}`, {
      method: request.method,
      credentials: "same-origin",
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body)
    });

    if (!response.ok) {
      throw new ApiError(response.statusText, response.status);
    }

    return (await response.json()) as T;
  };
}

export type MockHandler = (
  request: ApiRequest,
  context: TransportContext
) => unknown;

/**
 * In-memory transport for the serverless prototype. Routes are keyed by
 * `"<METHOD> <path>"`; unmapped routes resolve to an empty object. Swap to
 * {@link createFetchTransport} for a real API with no other call-site change.
 */
export function createMockTransport(
  handlers: Record<string, MockHandler> = {}
): Transport {
  return async <T>(
    request: ApiRequest,
    context: TransportContext
  ): Promise<T> => {
    const handler = handlers[`${request.method} ${request.path}`];
    return (handler ? handler(request, context) : {}) as T;
  };
}
