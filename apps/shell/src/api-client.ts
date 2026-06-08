import { createApiClient, createFetchTransport } from "@ginja/api-client";
import { getStoredToken } from "@ginja/auth";

/**
 * Shell-owned API client. The token is read from `@ginja/auth` (a shared
 * singleton) via `getStoredToken`, so api-client stays free of any auth
 * dependency. Requests are same-origin under `/api`; local development falls
 * back where the backend endpoint is not present yet.
 */
export const apiClient = createApiClient({
  baseUrl: "/api",
  getAccessToken: getStoredToken,
  transport: createFetchTransport()
});
