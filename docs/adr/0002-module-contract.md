# ADR 0002: Module Contract

## Status

Accepted

## Context

The App Shell needs to load vertical modules through Module Federation without reaching into each module's internal implementation. Each vertical module needs to run standalone during development and inside the shell at runtime.

The shell needs enough metadata to register routes, render navigation, apply permissions, evaluate feature flags, and handle loading and errors consistently.

## Decision

Each remote module exposes a manifest as its public integration contract:

```ts
import type { RouteObject } from "react-router-dom";

export interface RemoteModuleManifest {
  id: string;
  displayName: string;
  routeBasePath: `/${string}`;
  navigation: RemoteNavigationItem[];
  requiredPermissions: string[];
  featureFlags?: string[];
  routes: RouteObject[];
}

export interface RemoteNavigationItem {
  id: string;
  label: string;
  path: string;
  requiredPermissions?: string[];
  featureFlags?: string[];
  order?: number;
}
```

The shell consumes remote manifests to register top-level routes and navigation. Remote modules own nested routes under their assigned `routeBasePath`.

## Integration Rules

- The shell owns top-level routing, shared providers, loading states, error boundaries, permission checks, and feature flag handling.
- Vertical modules expose route objects and navigation metadata through the manifest.
- Vertical modules keep domain screens, state, validation, and business rules inside the owning module.
- A remote may include a standalone app entry for local development.
- Vertical modules must not import from other vertical modules.

## Consequences

- The shell integrates remotes through a stable public contract instead of internal file imports.
- Navigation and routing stay coherent at the platform level.
- Vertical teams can evolve internal module structure without forcing shell changes.
- Permission and feature flag behavior can be applied consistently before a route is shown or rendered.

## Follow-Up

During scaffold implementation:

- Place the manifest type in a stable package, likely `packages/shared-types`.
- Configure each remote to expose its manifest through Module Federation.
- Add shell loading and error boundaries around each remote route.
- Keep any standalone remote entry separate from the shell integration entry.
