import type { RouteObject } from "react-router-dom";

export const REMOTE_MODULE_CONTRACT_VERSION = 1;

export interface PlatformApiEnvelope<T> {
  error_details: unknown | null;
  message: string | null;
  result: T;
  status: number;
  success: boolean;
}

export interface ShellModuleResponse {
  module_id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  url: string | null;
  owner_team: string | null;
  version: string;
  entry_asset_url: string | null;
  asset_base_url: string | null;
  metadata: Record<string, unknown> | null;
  active_release: Record<string, unknown> | null;
}

export interface RemoteModuleManifest {
  id: string;
  displayName: string;
  routeBasePath: `/${string}`;
  navigation: RemoteNavigationItem[];
  requiredPermissions: string[];
  featureFlags?: string[];
  routes: RouteObject[];
  contractVersion: number;
  minShellVersion?: string;
  builtAt: string;
  gitSha: string;
}

export interface RemoteRegistryItem {
  id: string;
  displayName: string;
  routeBasePath: `/${string}`;
  scopeClassName: string;
  remoteName: string;
  remoteEntryUrl: string;
  requiredPermissions: string[];
  featureFlags?: string[];
  moduleId: string;
  code?: string;
  version: string;
  assetBaseUrl?: string;
}

export interface RemoteNavigationItem {
  id: string;
  label: string;
  path: string;
  requiredPermissions?: string[];
  featureFlags?: string[];
  order?: number;
}
