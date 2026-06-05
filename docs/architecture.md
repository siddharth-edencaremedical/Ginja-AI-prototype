# Architecture

## Purpose

This document is the architecture baseline for the insurance SaaS prototype. It expands on `docs/brief.md` and records the platform shape that the scaffold should implement.

The goal is to validate a modular frontend architecture where independent teams can own insurance business areas while users experience one coherent application.

## Platform Shape

The prototype uses a monorepo with three major layers:

```txt
apps/
  shell/
  product-config/
  underwriting/

packages/
  design-system/
  shared-types/
  auth/
  api-client/
  permissions/
  logging/
  feature-flags/
```

- The App Shell is the host application.
- Vertical modules are independently owned insurance business domains loaded by the shell.
- Horizontal packages are shared platform capabilities reused by the shell and vertical modules.

The accepted build stack is documented in `docs/adr/0001-build-stack.md`.

## App Shell

The App Shell owns platform-level experience and integration concerns:

- Global layout
- Primary navigation
- Top-level routing
- Authentication state
- Tenant or organization context
- Remote module loading
- Module loading states
- Module error boundaries
- Shared providers
- Feature flag bootstrapping
- Permission context

The shell should not own vertical business workflows. Its job is to compose modules, apply platform context, and route users to the correct business area.

## Vertical Modules

Initial vertical modules:

- Product Config
- Underwriting

Future vertical modules may include Claims, Policy Administration, Billing, and Member Management.

Each vertical module owns:

- Domain screens and workflows
- Domain routes below the shell-owned route prefix
- Domain-specific state
- Domain-specific API calls through approved platform clients
- Domain validation and business rules
- Module-owned mock data for prototype workflows

Vertical modules must run in two modes:

- Standalone during development
- Loaded by the App Shell through Module Federation

Vertical modules must not directly import from other vertical modules.

## Horizontal Packages

Horizontal packages represent stable platform capabilities:

- `design-system`: Shadcn components, tokens, layout primitives, and shared UI conventions
- `shared-types`: stable cross-module contracts only
- `auth`: identity/session abstractions and React provider hooks
- `api-client`: HTTP client, auth headers, error handling, and mock transport integration
- `permissions`: capability checks and role/policy helpers
- `logging`: structured frontend logging interface
- `feature-flags`: typed feature flag access and defaults

A type, utility, or component should stay inside a vertical module unless multiple modules genuinely need the same stable contract.

## Module Federation

The shell loads vertical modules as remotes through Module Federation. Runtime integration should be explicit and based on a module manifest, not ad hoc imports.

Each remote exposes a manifest with this initial contract:

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

The shell consumes this contract, wraps remote routes in shared providers, and applies loading, error, permission, and feature flag handling. The accepted module contract is documented in `docs/adr/0002-module-contract.md`.

### Loading Strategy

Remotes are **not** declared in the shell's build-time `moduleFederation.remotes`. A static entry would register every remote's `remoteEntry.js` URL with the MF runtime up front, so the browser would contact a remote's origin to bootstrap its container even for users who lack access — leaking that code (and the request itself) to unauthorized sessions.

Instead the shell registers and loads each remote at runtime, gated by permission:

- The shell holds a registry of `{ remoteName, remoteEntryUrl, requiredPermissions }` per remote (URLs injected via `source.define` from environment config).
- On session load it evaluates each remote's `requiredPermissions` against the user **before** touching the MF runtime. Only when the gate passes does it call `registerRemotes(...)` then `loadRemote("<name>/manifest")`.
- A user without a remote's permission never registers it, so the browser makes **zero** requests to that remote's origin — on the home flow and on a direct deep-link to the remote's route (which renders "Access denied").

`requiredPermissions` therefore lives in two synchronized places: the shell registry (to gate loading) and the remote manifest (re-checked at render as defense-in-depth).

## Routing

The shell owns top-level route registration:

- `/` is owned by the shell.
- `/product-config/*` is owned by the Product Config remote.
- `/underwriting/*` is owned by the Underwriting remote.
- `/settings/*` is owned by the shell or a future platform module.

Vertical modules own nested route objects under their assigned route prefix. Remote navigation paths should resolve under the remote's `routeBasePath`.

## Cross-Module Integration

Vertical modules should integrate through stable platform mechanisms:

- Shared stable types
- URL parameters
- Shell-owned navigation
- Platform events, if needed later
- Backend/API contracts

Avoid:

- Direct imports between vertical modules
- Shared mutable frontend state across verticals
- One vertical depending on another vertical's internal routes, stores, or components

## Prototype Data

The prototype uses mocked APIs with realistic insurance entities:

- Tenants or organizations
- Users and roles
- Permissions
- Products
- Underwriting cases
- Policy/member references where useful

Mocking should live behind `api-client` so modules use the same access pattern they would use with real APIs later.

## Design System

The design system is a shared Shadcn-based package. It should provide:

- Shared component exports
- Theme tokens
- Layout primitives
- Common form patterns
- Common table/list patterns
- App shell primitives where appropriate

The design system should not own business-specific UI unless the pattern is reused across modules.

## Guardrails

The scaffold should include architecture guardrails early:

- Nx dependency boundaries
- Explicit project tags for shell, vertical modules, and horizontal packages
- ADRs for major decisions
- Module manifest convention
- Typed package exports
- Shared dependency version alignment for React and core runtime libraries

These guardrails make the prototype useful as an architecture exercise, not just a folder layout.
