import type {
  RemoteRegistryItem,
  RemoteRegistryResponse
} from "@ginja/shared-types";

import { apiClient } from "./api-client";

export interface KnownRemoteRegistration {
  id: string;
  displayName: string;
  routeBasePath: `/${string}`;
  scopeClassName: string;
  requiredPermissions: string[];
  featureFlags?: string[];
  remoteName: string;
}

const productConfigRegistration: KnownRemoteRegistration = {
  id: "product-config",
  displayName: "Product Config",
  routeBasePath: "/product-config",
  scopeClassName: "product-config-remote",
  requiredPermissions: ["product-config:view"],
  remoteName: "product_config"
};

const underwritingRegistration: KnownRemoteRegistration = {
  id: "underwriting",
  displayName: "Underwriting",
  routeBasePath: "/underwriting",
  scopeClassName: "underwriting-remote",
  requiredPermissions: ["underwriting:view"],
  remoteName: "underwriting"
};

export const knownRemoteRegistrations: KnownRemoteRegistration[] = [
  productConfigRegistration,
  underwritingRegistration
];

const localDevelopmentRemoteRegistry: RemoteRegistryItem[] = [
  {
    ...productConfigRegistration,
    remoteEntryUrl: "http://localhost:4201/remoteEntry.js",
    version: "local-dev",
    contractVersion: 1,
    builtAt: "1970-01-01T00:00:00.000Z",
    gitSha: "local-dev"
  },
  {
    ...underwritingRegistration,
    remoteEntryUrl: "http://localhost:4202/remoteEntry.js",
    version: "local-dev",
    contractVersion: 1,
    builtAt: "1970-01-01T00:00:00.000Z",
    gitSha: "local-dev"
  }
];

export async function fetchRuntimeRemoteRegistry(): Promise<RemoteRegistryItem[]> {
  const response = await apiClient.get<RemoteRegistryResponse>("/runtime/remotes");

  if (!Array.isArray(response.remotes)) {
    throw new Error("Runtime remote registry response did not include remotes.");
  }

  return response.remotes;
}

export function getLocalDevelopmentRemoteRegistry(): RemoteRegistryItem[] {
  return localDevelopmentRemoteRegistry;
}

export function isLocalDevelopmentHost(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}
