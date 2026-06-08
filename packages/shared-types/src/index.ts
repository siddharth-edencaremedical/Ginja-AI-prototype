import type { RouteObject } from "react-router-dom";

export const REMOTE_MODULE_CONTRACT_VERSION = 1;

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
  version: string;
  contractVersion: number;
  minShellVersion?: string;
  builtAt: string;
  gitSha: string;
}

export interface RemoteRegistryResponse {
  remotes: RemoteRegistryItem[];
}

export interface RemoteNavigationItem {
  id: string;
  label: string;
  path: string;
  requiredPermissions?: string[];
  featureFlags?: string[];
  order?: number;
}
