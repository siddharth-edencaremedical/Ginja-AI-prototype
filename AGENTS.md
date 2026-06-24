# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Commands

```bash
# Development (start each in a separate terminal)
pnpm dev:shell             # Shell host app — http://localhost:4200
pnpm dev:claims    # Claims remote — http://localhost:4201
pnpm dev:finance      # Finance remote — http://localhost:4202

# Build / check all projects
pnpm build                 # nx run-many -t build --all
pnpm typecheck             # nx run-many -t typecheck --all
pnpm lint                  # nx run-many -t lint --all

# Single project
pnpm nx build shell
pnpm nx typecheck claims
pnpm nx lint auth
```

> Tests are not yet configured — testing is deferred to a future milestone.

## Architecture

This is a **Module Federation monorepo** for an insurance SaaS prototype. The goal is to validate a federated architecture where product teams own independent vertical modules while users experience one cohesive app.

**Toolchain:** PNPM workspaces + Nx + Rsbuild/Rspack + React 19 + TypeScript 5 (strict) + Tailwind v4 + shadcn/ui

### Project Layout

```
apps/
  shell/            Host application (port 4200) — owns layout, routing, nav
  claims/           Vertical remote (port 4201) — claims operations domain
  finance/          Vertical remote (port 4202) — finance operations domain
packages/
  shared-types/     RemoteModuleManifest — the shell↔remote contract
  auth/             AuthProvider, useSession — session context
  design-system/    shadcn/ui components (Radix UI + CVA + Tailwind v4)
  api-client/       HTTP client abstraction with swappable transport
  permissions/      hasPermission / hasAnyPermission / hasEveryPermission
  feature-flags/    FeatureFlagsProvider, useFeatureFlags
  logging/          createLogger with scope/level/context
```

### Shell ↔ Remote Contract

The integration API is `RemoteModuleManifest` (`@ginja/shared-types`). Each remote exports a manifest from `src/remote/manifest.tsx` that declares:
- `id`, `displayName`, `routeBasePath`
- `routes` — React Router `RouteObject[]` the shell mounts under the remote's base path
- `navigationItems` — nav entries with optional `requiredPermissions` / `requiredFeatureFlags` guards

After authentication, the shell (`apps/shell/src/app.tsx`) fetches active module releases from the platform service modules API (`/api/v1/platform/shell/modules`) using the current session bearer. Returned `ShellModuleResponse` records are mapped by `moduleId` to known shell metadata in `apps/shell/src/remote-registry.ts`; local development falls back to localhost entries when the platform endpoint is not available. The shell registers a remote with the MF runtime and loads its manifest (`registerRemotes` + `loadRemote` from `@module-federation/runtime-tools`) **only after the access gate passes** — so a user without a remote's permission never has its URL handed to the runtime and the browser makes zero requests to its origin (even on a direct deep-link, which renders "Access denied"). Once loaded, the shell reads the manifest, filters nav items by permission/flag, and wraps each remote in an error boundary. Remotes must not know about each other.

Because gating happens before load, each remote's `requiredPermissions` lives in **two** places that must stay in sync: the shell's known remote metadata (so the shell can gate without loading) and the remote's own manifest (defense-in-depth, re-checked at render). The shell also keeps non-URL known route metadata for blocked deep links and localhost fallback behavior.

### Module Boundary Rules (enforced by ESLint + Nx)

| Tag | Can depend on |
|-----|--------------|
| `type:app-shell` | `type:platform` only |
| `type:vertical` | `type:platform` only |
| `type:platform` | `type:platform` only |

Cross-vertical imports (`scope:claims` ↔ `scope:finance`) are forbidden. Platform packages cannot depend on apps. These rules are encoded in `eslint.config.mjs` and `nx.json` — `pnpm lint` enforces them.

### Design System

`@ginja/design-system` provides shadcn/ui-style components backed by Radix UI primitives, styled with Tailwind v4 utility classes, and composed using `class-variance-authority`. CSS design tokens live in `packages/design-system/src/styles/globals.css` as CSS custom properties under the shadcn variable schema (`--primary`, `--foreground`, `--border`, etc.), wired to Tailwind via `@theme inline`.

To add a new component: write it under `packages/design-system/src/components/`, re-export from `src/index.ts`, and add a `./components/<name>` entry to `package.json` exports. Components follow the `forwardRef` + CVA + `cn()` pattern established by the existing six.

All three `rsbuild.config.ts` files load Tailwind via `pluginTailwindcss()` (note lowercase 'c') from `@rsbuild/plugin-tailwindcss`.

### Shared Dependencies via Module Federation

`react`, `react-dom`, `react-router-dom`, `@ginja/auth`, `@ginja/design-system`, and `@ginja/feature-flags` are declared as `shared` singletons in each app's `rsbuild.config.ts`. Only one copy of these runs in the browser at any time. When adding new cross-cutting packages, declare them as shared in all three `rsbuild.config.ts` files.

The shell's `rsbuild.config.ts` deliberately leaves `moduleFederation.options.remotes` **empty** — a static `remotes` entry would hand the runtime each `remoteEntry.js` URL eagerly. Remote URLs are instead selected at runtime from the platform service modules API, with localhost fallback entries in `apps/shell/src/remote-registry.ts`, and registered by the gated loader. When adding a remote: add non-URL shell route metadata, map its platform module id, and add it to the platform release upload script.

### Path Aliases

All `@ginja/*` packages are mapped in `tsconfig.base.json`. Each app's `rsbuild.config.ts` mirrors these aliases for bundling. When adding a new package, update both files.

## Key Files

| File | Purpose |
|------|---------|
| `apps/shell/src/app.tsx` | Remote registry, layout, routing, error boundaries |
| `apps/*/src/remote/manifest.tsx` | Module Federation export — public API of each vertical |
| `packages/shared-types/src/index.ts` | `RemoteModuleManifest` interface |
| `docs/architecture.md` | Full architecture rationale |
| `docs/module-boundaries.md` | Dependency rules and Nx tag conventions |
| `docs/adr/` | Build stack and module contract decisions |
