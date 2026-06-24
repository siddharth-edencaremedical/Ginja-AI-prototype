import type {
  PlatformApiEnvelope,
  RemoteRegistryItem,
  ShellModuleResponse
} from "@ginja/shared-types";

export interface KnownRemoteRegistration {
  id: string;
  moduleId: string;
  platformCode: string;
  displayName: string;
  routeBasePath: `/${string}`;
  scopeClassName: string;
  requiredPermissions: string[];
  featureFlags?: string[];
  remoteName: string;
}

const shellModulesPath = "/api/v1/platform/shell/modules";
const shellRemoteAssetsPath = "/api/v1/platform/shell/remote-assets";

const claimsRegistration: KnownRemoteRegistration = {
  id: "claims",
  moduleId: normalizeConfiguredValue(__CLAIMS_MODULE_ID__, "claims"),
  platformCode: "CLAIMS",
  displayName: "Claims",
  routeBasePath: "/claims",
  scopeClassName: "claims-remote",
  requiredPermissions: ["claims:view"],
  remoteName: "claims"
};

const financeRegistration: KnownRemoteRegistration = {
  id: "finance",
  moduleId: normalizeConfiguredValue(__FINANCE_MODULE_ID__, "finance"),
  platformCode: "FINANCE",
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
  const headers = new Headers({ Accept: "application/json" });

  const response = await fetch(shellModulesPath, {
    headers,
    method: "GET"
  });

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
  const knownRemoteByPlatformCode = new Map(
    knownRemoteRegistrations.map((registration) => [
      normalizePlatformCode(registration.platformCode),
      registration
    ])
  );
  const knownRemoteById = new Map(
    knownRemoteRegistrations.map((registration) => [
      registration.id,
      registration
    ])
  );

  return modules.flatMap((module) => {
    const moduleId = normalizeOptionalValue(module.module_id);
    const remoteEntryUrl = normalizeOptionalValue(module.entry_asset_url);
    const assetBaseUrl = normalizeOptionalValue(module.asset_base_url);
    const knownRegistration =
      (moduleId ? knownRemoteByModuleId.get(moduleId) : undefined) ??
      knownRemoteByPlatformCode.get(normalizePlatformCode(module.code)) ??
      getKnownRemoteFromMetadata(module.metadata, knownRemoteById);

    if (!knownRegistration || !moduleId || !remoteEntryUrl) {
      return [];
    }

    return [
      {
        ...knownRegistration,
        moduleId,
        code: module.code,
        displayName: module.name || knownRegistration.displayName,
        remoteEntryUrl:
          createShellRemoteAssetUrl(assetBaseUrl) ?? remoteEntryUrl,
        version: module.version,
        assetBaseUrl
      }
    ];
  });
}

function getKnownRemoteFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  knownRemoteById: Map<string, KnownRemoteRegistration>
): KnownRemoteRegistration | undefined {
  const remoteId = metadata?.remoteId;

  if (typeof remoteId !== "string") {
    return undefined;
  }

  return knownRemoteById.get(remoteId.trim());
}

function normalizeConfiguredValue(value: string, fallback: string): string {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeOptionalValue(
  value: string | null | undefined
): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function normalizePlatformCode(value: string): string {
  return value.trim().toUpperCase();
}

function createShellRemoteAssetUrl(
  assetBaseUrl: string | undefined
): string | undefined {
  if (!assetBaseUrl) {
    return undefined;
  }

  return `${shellRemoteAssetsPath}/${encodeURIComponent(assetBaseUrl)}/remoteEntry.js`;
}
