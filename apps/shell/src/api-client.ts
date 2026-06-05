import { createApiClient, createMockTransport } from "@ginja/api-client";
import { getStoredToken } from "@ginja/auth";

/**
 * Shell-owned API client. The token is read from `@ginja/auth` (a shared
 * singleton) via `getStoredToken`, so api-client stays free of any auth
 * dependency. Swap `createMockTransport` for `createFetchTransport()` to talk
 * to a real backend with no other change.
 */
export const apiClient = createApiClient({
  baseUrl: "/api",
  getAccessToken: getStoredToken,
  transport: createMockTransport({
    "GET /me": (_request, context) => ({ tokenAttached: Boolean(context.token) })
  })
});
