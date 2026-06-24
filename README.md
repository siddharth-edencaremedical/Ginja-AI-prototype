# Ginja AI Prototype

Insurance SaaS frontend prototype for validating a federated, team-owned module architecture. The app is built as a PNPM/Nx monorepo with a Module Federation shell, two vertical remotes, and shared platform packages for auth, permissions, feature flags, logging, API access, shared types, and a shadcn-based design system.

The main point of the prototype is architectural: product teams should be able to own independent vertical modules while users experience one cohesive application. The shell is responsible for platform concerns such as login, layout, navigation, top-level routing, and permission-gated remote loading.

## What This Prototype Demonstrates

- A host shell that composes vertical modules through Module Federation.
- Claims and Finance as independently owned vertical remotes.
- A typed shell-to-remote contract through `RemoteModuleManifest`.
- Permission-gated remote loading: unauthorized modules are not registered with the Module Federation runtime and their `remoteEntry.js` URLs are not requested by the browser.
- Shared singleton dependencies for React, React DOM, React Router, auth, design-system, and feature flags.
- A shared shadcn/ui-style design system backed by Radix primitives, Tailwind v4 tokens, CVA variants, and workspace exports.
- Nx and ESLint module boundaries that prevent cross-vertical imports and keep platform packages independent from apps.

## Tech Stack

- Package manager: PNPM workspaces
- Build orchestration: Nx
- Bundler/dev server: Rsbuild with Rspack
- Federation runtime: Module Federation runtime tools
- UI: React 19, React Router 7
- Language: TypeScript 5 with strict settings
- Styling: Tailwind v4
- Design system: shadcn/ui-style components, Radix UI, CVA, Tailwind tokens
- Icons: lucide-react

## Repository Layout

```txt
apps/
  shell/             Host app on port 4200. Owns login, layout, routing, nav, and remote loading.
  claims/            Vertical remote on port 4201. Owns claims operations workflows.
  finance/           Vertical remote on port 4202. Owns finance operations workflows.

packages/
  api-client/        HTTP client abstraction and transport boundary for future real APIs.
  auth/              AuthProvider, session hooks, demo personas, mock auth client.
  design-system/     Shared shadcn-style components, tokens, assets, and utilities.
  feature-flags/     FeatureFlagsProvider and flag helpers.
  logging/           Scoped frontend logger.
  permissions/       Permission helper functions.
  shared-types/      Stable shell-to-remote TypeScript contracts.

docs/
  architecture.md
  module-boundaries.md
  adr/
```

## Quick Start

Use a current Node LTS release and the PNPM version declared in `package.json`.

```bash
corepack enable
pnpm install
```

Start each app in a separate terminal:

```bash
pnpm dev:claims
pnpm dev:finance
pnpm dev:shell
```

Open the shell:

```txt
http://localhost:4200
```

The remotes are served at:

```txt
Claims: http://localhost:4201
Finance:   http://localhost:4202
```

The shell loads each remote's `remoteEntry.js` only after the current user passes that remote's permission gate.

To exercise the Cloudflare Worker skeleton locally, build the shell static
assets first and then start Wrangler:

```bash
pnpm nx build shell
pnpm dev:worker
```

Wrangler serves the shell at `http://localhost:8787`.

## Demo Login

All demo personas use the same password:

```txt
ginja-ai
```

| Persona | Email | Permissions |
| --- | --- | --- |
| Admin | `admin@example.ginja.ai` | `claims:view`, `finance:view`, `settings:view` |
| Finance Analyst | `finance@example.ginja.ai` | `finance:view` |
| Claims Lead | `claims@example.ginja.ai` | `claims:view` |

The login screen has persona buttons that prefill the email and password.

## Runtime Architecture

The shell owns the application frame:

- Authentication and session restoration
- Login/logout flow
- Tenant/user display
- Sidebar navigation
- Top-level routes
- Remote registration and manifest loading
- Remote loading, failed, blocked, and render-error states

Each vertical remote owns its domain screens and nested routes below its base path:

- `/claims/*` is owned by Claims.
- `/finance/*` is owned by Finance.

Vertical modules do not import from each other. Shared behavior must go through platform packages under `packages/`.

## Shell to Remote Contract

Each remote exposes a manifest from `src/remote/manifest.tsx`. The shell loads that manifest and mounts its routes under the remote's base route.

```ts
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

export interface RemoteNavigationItem {
  id: string;
  label: string;
  path: string;
  requiredPermissions?: string[];
  featureFlags?: string[];
  order?: number;
}
```

The contract lives in `packages/shared-types/src/index.ts`.

Current remote manifests:

- `apps/claims/src/remote/manifest.tsx`
- `apps/finance/src/remote/manifest.tsx`

## Permission-Gated Module Loading

This is the most important behavior in the prototype.

The shell does not declare remotes statically in `apps/shell/rsbuild.config.ts`. Its Module Federation `remotes` object is intentionally empty:

```ts
moduleFederation: {
  options: {
    name: "shell",
    remotes: {},
    shared
  }
}
```

A static `remotes` config would hand every remote URL to the Module Federation runtime up front. That can cause the browser to contact remote origins even when the user should not have access.

Instead, after authentication the shell fetches active module releases through
the shell Worker:

```ts
GET /api/v1/platform/shell/modules
```

The Worker proxies that request to the platform service and sends
`Authorization: Bearer <PLATFORM_SERVICE_TOKEN>` from its Cloudflare environment.
The browser never receives that token. The shell maps the returned
`ShellModuleResponse[]` records to its local known remote metadata by
`module_id`, falling back to stable platform `code` / release metadata when an
explicit module id was not baked into the shell build. It then registers only
known, permitted modules with Module Federation. Unknown platform modules are
ignored until they have explicit shell routing and permission metadata. On
localhost, if the Worker proxy is not available,
`apps/shell/src/remote-registry.ts` returns a development fallback registry with
the current dev remote URLs.

At runtime:

1. The user logs in and the shell receives a session.
2. The shell calls `GET /api/v1/platform/shell/modules` on the shell Worker.
3. The Worker calls the platform service with `PLATFORM_SERVICE_TOKEN`.
4. If the Worker proxy is absent on localhost, the shell uses the local dev fallback registry.
5. The shell checks each URL-bearing registry entry with `hasEveryPermission(...)` and feature flag helpers.
6. If the user is not allowed, the remote state is `blocked`.
7. Blocked remotes are not passed to `registerRemotes(...)`.
8. Blocked remotes are not loaded with `loadRemote(...)`.
9. The browser makes zero requests to that remote's origin, including on direct deep links.
10. If the user is allowed, the shell registers the remote and loads only its `manifest`.
11. The manifest is re-checked at render time as defense in depth.

Because the shell must decide before loading a remote, required permissions live in two places:

- The shell's known remote metadata, so it can gate loading before touching the remote.
- The remote's own manifest, so access is re-checked after load.

Keep those values in sync when adding or changing a remote.

### How to Verify the No-Load Behavior

1. Start all three dev servers.
2. Open `http://localhost:4200`.
3. Open the browser Network tab and filter for `remoteEntry.js`.
4. Sign in as Claims Lead.
5. Confirm `http://localhost:4201/remoteEntry.js` is requested.
6. Confirm `http://localhost:4202/remoteEntry.js` is not requested.
7. Navigate directly to `http://localhost:4200/finance`.
8. Confirm the shell shows the unavailable workspace state and still does not request the finance remote entry.

Repeat with the Finance Analyst persona to verify the inverse.

## Module Federation Details

Each remote exposes only its manifest:

```ts
moduleFederation: {
  options: {
    name: "claims",
    filename: "remoteEntry.js",
    exposes: {
      "./manifest": "./src/remote/manifest.tsx"
    },
    shared
  }
}
```

The current remote names and dev URLs are:

| Remote | MF name | Dev URL |
| --- | --- | --- |
| Claims | `claims` | `http://localhost:4201/remoteEntry.js` |
| Finance | `finance` | `http://localhost:4202/remoteEntry.js` |

Shared singleton dependencies are declared in all three app `rsbuild.config.ts` files:

- `react`
- `react-dom`
- `react-router-dom`
- `@ginja/auth`
- `@ginja/design-system`
- `@ginja/feature-flags`

When adding another cross-cutting runtime package, add it to the `shared` object in all app Rsbuild configs.

## Environment Variables

The shell no longer inlines remote entry URLs at build time. Remote entry URL
selection comes from the platform service modules API; local development falls
back to the localhost URLs in `apps/shell/src/remote-registry.ts`.

Shell build configuration:

- `PLATFORM_SERVICE_BASE_URL` defaults to `https://ginja-ai-internal-platform-service.onrender.com`.
- `CLAIMS_MODULE_ID` maps the Claims vertical to a platform module record.
- `FINANCE_MODULE_ID` maps the Finance vertical to a platform module record.

Remote builds use an automatic asset prefix so follow-up chunks, CSS, fonts, and
images load relative to the served `remoteEntry.js`. Remote builds also accept
optional `REMOTE_BUILD_BUILT_AT`, `REMOTE_BUILD_GIT_SHA`, and
`REMOTE_MIN_SHELL_VERSION` values for manifest metadata.

Example:

```bash
pnpm nx build claims

pnpm nx build finance
```

## Development Commands

Run these from the repository root.

```bash
# Start dev servers
pnpm dev:shell
pnpm dev:claims
pnpm dev:finance

# Start Cloudflare Worker skeleton after building the shell
pnpm dev:worker

# Build all projects
pnpm build

# Typecheck all projects
pnpm typecheck

# Lint all projects
pnpm lint

# Single project examples
pnpm nx build shell
pnpm nx build claims
pnpm nx build finance
pnpm nx typecheck claims
pnpm nx lint auth
```

Tests are not configured yet. Current validation is build, typecheck, lint, and manual browser verification.

## Cloudflare Worker Runtime

The Cloudflare runtime lives in `apps/cloudflare-worker/src/index.ts`, with root
configuration in `wrangler.toml`. It uses Workers Static Assets to serve
`dist/apps/shell` through the `ASSETS` binding. Vertical module release
metadata, artifact storage, activation, and rollback are owned by the platform
service, not by Cloudflare D1/R2.

## Cloudflare Prototype Deployment

Run these from the repository root after installing dependencies and logging in
with Wrangler:

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
```

Build and deploy the shell Worker with Workers Static Assets:

```bash
PLATFORM_SERVICE_TOKEN=<token> \
PLATFORM_SERVICE_BASE_URL=https://ginja-ai-internal-platform-service.onrender.com \
CLAIMS_MODULE_ID=<claims-module-id> \
FINANCE_MODULE_ID=<finance-module-id> \
pnpm cf:deploy:shell
```

The deploy helper stores `PLATFORM_SERVICE_TOKEN`, and
`PLATFORM_SERVICE_BASE_URL` when provided, as Cloudflare Worker secrets after
deployment. The shell Worker uses those bindings when proxying
`GET /api/v1/platform/shell/modules` to the platform service. The module id
values are build-time shell configuration and must be present when building or
deploying the shell, not only when publishing remote releases.

Publish vertical release artifacts through the platform service:

```bash
PLATFORM_SERVICE_TOKEN=<token> \
CLAIMS_MODULE_ID=<module-id> \
pnpm platform:release:remote claims

PLATFORM_SERVICE_TOKEN=<token> \
FINANCE_MODULE_ID=<module-id> \
pnpm platform:release:remote finance
```

Release activation and rollback are handled by the platform service.

## GitHub Actions CI/CD

The repository uses GitHub Actions for both verification and deployment:

- `CI` runs on every pull request and on pushes to `main`.
- It uses `nx affected` so only changed projects, plus their dependents, run `lint`, `typecheck`, and `build`.
- `Deploy` runs after `CI` succeeds on `main`.
- It uses `nx affected` to build only the changed projects, deploys the shell Worker only when the shell, worker, or worker config changed, and uploads releases only for affected remotes.
- Root infra changes such as `wrangler.toml` still trigger the relevant deploy steps even though Nx does not surface them as affected apps.

Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `PLATFORM_SERVICE_TOKEN`

Required repository variables or secrets:

- `PLATFORM_SERVICE_BASE_URL`
- `CLAIMS_MODULE_ID`
- `FINANCE_MODULE_ID`
- `CLAIMS_MAJOR_VERSION`
- `CLAIMS_MINOR_VERSION`
- `FINANCE_MAJOR_VERSION`
- `FINANCE_MINOR_VERSION`

## Production Build

Build all apps and packages:

```bash
pnpm build
```

Nx runs each project's `build` target and writes artifacts under `dist/`.

```txt
dist/apps/shell/
dist/apps/claims/
dist/apps/finance/
dist/packages/*
```

For production-style release artifacts, build the shell and each remote
independently:

1. Build the shell:

   ```bash
   pnpm nx build shell
   ```

2. Build each remote:

   ```bash
   pnpm nx build claims

   pnpm nx build finance
   ```

3. Publish each remote's build output through `pnpm platform:release:remote <remote>`.
   Production remote builds intentionally omit `index.html`; standalone remote
   apps are for local dev only.

The shell still dynamically requests `remoteEntry.js` only after permission
checks pass. Runtime remote URL selection comes from the platform service
modules API, not from shell build-time remote URLs.

## shadcn Design System

The shared UI package is `packages/design-system`.

It follows shadcn/ui conventions:

- Components live as source code in `packages/design-system/src/components/`.
- Components use Radix primitives where appropriate.
- Variants are modeled with `class-variance-authority`.
- Conditional class merging goes through `cn()` from `packages/design-system/src/lib/utils.ts`.
- Tokens live in `packages/design-system/src/styles/globals.css`.
- Tailwind v4 is wired through `@theme inline`.
- Apps import the shared stylesheet through `@ginja/design-system/styles.css`.

Current component exports include:

- `Alert`
- `Avatar`
- `Badge`
- `Button`
- `Card`
- `DropdownMenu`
- `Field`
- `Input`
- `Progress`
- `Separator`
- `Sheet`
- `Sidebar`
- `Skeleton`
- `Table`
- `Tabs`
- `Toggle`
- `ToggleGroup`
- `Tooltip`

When adding a design-system component:

1. Add it under `packages/design-system/src/components/`.
2. Follow the existing `forwardRef`, Radix, CVA, and `cn()` patterns.
3. Re-export it from `packages/design-system/src/index.ts`.
4. Keep it reachable through `packages/design-system/package.json` exports. The current `./components/*` export covers component subpaths.
5. Keep business-specific UI inside the owning vertical unless the pattern is genuinely reusable.

Do not duplicate shadcn components inside vertical apps. Vertical apps should consume `@ginja/design-system` so the shell and remotes stay visually consistent.

## Module Boundaries

Project tags are declared in each `project.json`, and boundaries are enforced by `eslint.config.mjs`.

| Project type | Can depend on |
| --- | --- |
| `type:app-shell` | `type:platform` only |
| `type:vertical` | `type:platform` only |
| `type:platform` | `type:platform` only |

Additional constraints:

- Claims cannot import Finance.
- Finance cannot import Claims.
- Platform packages cannot import apps or vertical modules.

Run this to check boundaries:

```bash
pnpm lint
```

## Adding a New Remote

Use this checklist when adding a new vertical module:

1. Create the app under `apps/<remote-name>`.
2. Give it Nx tags `type:vertical` and an appropriate `scope:*`.
3. Add a `src/remote/manifest.tsx` that exports `RemoteModuleManifest`.
4. Expose the manifest in the remote's `rsbuild.config.ts`.
5. Add non-URL shell route metadata to `apps/shell/src/remote-registry.ts`.
6. Add the localhost fallback URL in `apps/shell/src/remote-registry.ts`.
7. Add the remote to the platform release service and map its module id in the shell build config.
8. Add matching `requiredPermissions` to the remote manifest.
9. Add any new feature flags to `@ginja/feature-flags`.
10. Add shared singleton dependencies to all app Rsbuild configs if the new remote needs a cross-cutting runtime package.
11. Add the remote to `scripts/platform/release-remote.mjs` release metadata.
12. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

Do not add the remote to the shell's static `moduleFederation.options.remotes`. That would bypass the no-load-until-authorized behavior.

## Important Source Files

| File | Purpose |
| --- | --- |
| `apps/shell/src/app.tsx` | Runtime registry consumption, permission gate, shell layout, nav, remote routes, error boundaries |
| `apps/shell/src/remote-registry.ts` | Known shell remote route metadata and localhost registry fallback |
| `apps/shell/rsbuild.config.ts` | Shell build config with empty static remotes config |
| `apps/claims/src/remote/manifest.tsx` | Claims public remote contract |
| `apps/finance/src/remote/manifest.tsx` | Finance public remote contract |
| `packages/shared-types/src/index.ts` | `RemoteModuleManifest`, runtime registry, and navigation contracts |
| `packages/auth/src/client.ts` | Demo personas and mock auth backend |
| `packages/design-system/src/styles/globals.css` | Tailwind v4 and shadcn token setup |
| `eslint.config.mjs` | Nx module boundary enforcement |
| `docs/architecture.md` | Deeper architecture rationale |
| `docs/module-boundaries.md` | Dependency rules and tag conventions |

## Current Prototype Scope

This is a frontend architecture prototype. It uses mock data and mock auth so the team can evaluate module ownership, runtime loading, navigation, and UI consistency without waiting on backend integration.

The next likely milestones are:

- Add real API transport behind `@ginja/api-client`.
- Add automated tests once workflows stabilize.
- Add more vertical modules such as billing, policy administration, or member management.
- Extend CI with tests once they are introduced.
