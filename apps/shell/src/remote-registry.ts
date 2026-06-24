import type {
  PlatformApiEnvelope,
  RemoteRegistryItem,
  ShellModuleResponse
} from "@ginja/shared-types";
import { getStoredToken } from "@ginja/auth";

export interface KnownRemoteRegistration {
  id: string;
  moduleId: string;
  displayName: string;
  routeBasePath: `/${string}`;
  scopeClassName: string;
  requiredPermissions: string[];
  featureFlags?: string[];
  remoteName: string;
}

const platformServiceBaseUrl = normalizeBaseUrl(__PLATFORM_SERVICE_BASE_URL__);

const claimsRegistration: KnownRemoteRegistration = {
  id: "claims",
  moduleId: normalizeConfiguredValue(__CLAIMS_MODULE_ID__, "claims"),
  displayName: "Claims",
  routeBasePath: "/claims",
  scopeClassName: "claims-remote",
  requiredPermissions: ["claims:view"],
  remoteName: "claims"
};

const financeRegistration: KnownRemoteRegistration = {
  id: "finance",
  moduleId: normalizeConfiguredValue(__FINANCE_MODULE_ID__, "finance"),
  displayName: "Finance",
  routeBasePath: "/finance",
  scopeClassName: "finance-remote",
  requiredPermissions: ["finance:view"],
  remoteName: "finance"
};

export const knownRemoteRegistrations: KnownRemoteRegistration[] = [
  claimsRegistration,
  financeRegistration
];

const localDevelopmentRemoteRegistry: RemoteRegistryItem[] = [
  {
    ...claimsRegistration,
    remoteEntryUrl: "http://localhost:4201/remoteEntry.js",
    version: "local-dev"
  },
  {
    ...financeRegistration,
    remoteEntryUrl: "http://localhost:4202/remoteEntry.js",
    version: "local-dev"
  }
];

export async function fetchRuntimeRemoteRegistry(): Promise<RemoteRegistryItem[]> {
  const token = getStoredToken();
  const headers = new Headers({ Accept: "application/json" });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${platformServiceBaseUrl}/api/v1/platform/shell/modules`,
    {
      headers,
      method: "GET"
    }
  );

  if (!response.ok) {
    throw new Error(
      `Platform module registry returned ${response.status} ${response.statusText}.`
    );
  }

  const envelope =
    (await response.json()) as PlatformApiEnvelope<ShellModuleResponse[]>;

  if (!envelope.success || !Array.isArray(envelope.result)) {
    throw new Error("Platform module registry response did not include modules.");
  }

  return toRemoteRegistryItems(envelope.result);
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

function toRemoteRegistryItems(
  modules: ShellModuleResponse[]
): RemoteRegistryItem[] {
  const knownRemoteByModuleId = new Map(
    knownRemoteRegistrations.map((registration) => [
      registration.moduleId,
      registration
    ])
  );

  return modules.flatMap((module) => {
    const knownRegistration = knownRemoteByModuleId.get(module.moduleId);

    if (!knownRegistration || !module.entryAssetUrl) {
      return [];
    }

    return [
      {
        ...knownRegistration,
        code: module.code,
        displayName: module.name || knownRegistration.displayName,
        remoteEntryUrl: module.entryAssetUrl,
        version: module.version,
        assetBaseUrl: module.assetBaseUrl
      }
    ];
  });
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeConfiguredValue(value: string, fallback: string): string {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
}
