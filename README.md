# Ginja AI Prototype

Insurance SaaS frontend prototype for validating a federated, team-owned module architecture. The app is built as a PNPM/Nx monorepo with a Module Federation shell, two vertical remotes, and shared platform packages for auth, permissions, feature flags, logging, API access, shared types, and a shadcn-based design system.

The main point of the prototype is architectural: product teams should be able to own independent vertical modules while users experience one cohesive application. The shell is responsible for platform concerns such as login, layout, navigation, top-level routing, and permission-gated remote loading.

## What This Prototype Demonstrates

- A host shell that composes vertical modules through Module Federation.
- Product Config and Underwriting as independently owned vertical remotes.
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
  product-config/    Vertical remote on port 4201. Owns product/catalog workflows.
  underwriting/      Vertical remote on port 4202. Owns underwriting workflows.

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
pnpm dev:product-config
pnpm dev:underwriting
pnpm dev:shell
```

Open the shell:

```txt
http://localhost:4200
```

The remotes are served at:

```txt
Product Config: http://localhost:4201
Underwriting:   http://localhost:4202
```

The shell loads each remote's `remoteEntry.js` only after the current user passes that remote's permission gate.

To exercise the Cloudflare Worker skeleton locally, build the shell static
assets first and then start Wrangler:

```bash
pnpm nx build shell
pnpm dev:worker
```

Wrangler serves the shell and stub gateway at `http://localhost:8787`.

## Demo Login

All demo personas use the same password:

```txt
ginja-ai
```

| Persona | Email | Permissions |
| --- | --- | --- |
| Admin | `admin@example.ginja.ai` | `product-config:view`, `underwriting:view`, `settings:view` |
| Underwriter | `underwriter@example.ginja.ai` | `underwriting:view` |
| Product Manager | `product@example.ginja.ai` | `product-config:view` |

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

- `/product-config/*` is owned by Product Config.
- `/underwriting/*` is owned by Underwriting.

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

- `apps/product-config/src/remote/manifest.tsx`
- `apps/underwriting/src/remote/manifest.tsx`

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

Instead, after authentication the shell fetches runtime remote metadata from
`GET /api/runtime/remotes`. The response uses the shared
`RemoteRegistryResponse` contract and contains URL-bearing entries only for
remotes the backend is willing to expose to the current session:

```ts
interface RemoteRegistryResponse {
  remotes: RemoteRegistryItem[];
}
```

The shell also keeps non-URL route metadata in
`apps/shell/src/remote-registry.ts`. That metadata lets the shell render blocked
deep links without handing protected remote URLs to the Module Federation
runtime. On localhost, if `/api/runtime/remotes` is not available yet, the same
file returns a development fallback registry with the current dev remote URLs.

At runtime:

1. The user logs in and the shell receives a session.
2. The shell calls `GET /api/runtime/remotes`.
3. If the backend endpoint is absent on localhost, the shell uses the local dev fallback registry.
4. The shell checks each URL-bearing registry entry with `hasEveryPermission(...)` and feature flag helpers.
5. If the user is not allowed, the remote state is `blocked`.
6. Blocked remotes are not passed to `registerRemotes(...)`.
7. Blocked remotes are not loaded with `loadRemote(...)`.
8. The browser makes zero requests to that remote's origin, including on direct deep links.
9. If the user is allowed, the shell registers the remote and loads only its `manifest`.
10. The manifest is re-checked at render time as defense in depth.

Because the shell must decide before loading a remote, required permissions live in two places:

- The runtime registry item returned by `/api/runtime/remotes`, so the shell can gate loading without touching the remote.
- The remote's own manifest, so access is re-checked after load.

Keep those values in sync when adding or changing a remote.

### How to Verify the No-Load Behavior

1. Start all three dev servers.
2. Open `http://localhost:4200`.
3. Open the browser Network tab and filter for `remoteEntry.js`.
4. Sign in as Product Manager.
5. Confirm `http://localhost:4201/remoteEntry.js` is requested.
6. Confirm `http://localhost:4202/remoteEntry.js` is not requested.
7. Navigate directly to `http://localhost:4200/underwriting`.
8. Confirm the shell shows the unavailable workspace state and still does not request the underwriting remote entry.

Repeat with the Underwriter persona to verify the inverse.

## Module Federation Details

Each remote exposes only its manifest:

```ts
moduleFederation: {
  options: {
    name: "product_config",
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
| Product Config | `product_config` | `http://localhost:4201/remoteEntry.js` |
| Underwriting | `underwriting` | `http://localhost:4202/remoteEntry.js` |

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
selection comes from `/api/runtime/remotes`; local development falls back to the
localhost URLs in `apps/shell/src/remote-registry.ts`.

Remote production builds read `REMOTE_ASSET_BASE` to derive their asset prefix.
Set it to the immutable release base that the backend registry will expose for
that remote, so follow-up chunks, CSS, fonts, and images load from the same
protected gateway path as `remoteEntry.js`.

When `REMOTE_ASSET_BASE` is not set, remote builds default to `/` for local
build checks only. A `/` asset prefix is not a valid production remote release.
Remote builds also accept optional `REMOTE_BUILD_BUILT_AT`,
`REMOTE_BUILD_GIT_SHA`, and `REMOTE_MIN_SHELL_VERSION` values for manifest
metadata.

Example:

```bash
REMOTE_ASSET_BASE=/remote-assets/product-config/releases/2026.06.08-a1b2c3/ \
pnpm nx build product-config

REMOTE_ASSET_BASE=/remote-assets/underwriting/releases/2026.06.08-d4e5f6/ \
pnpm nx build underwriting
```

## Development Commands

Run these from the repository root.

```bash
# Start dev servers
pnpm dev:shell
pnpm dev:product-config
pnpm dev:underwriting

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
pnpm nx build product-config
pnpm nx build underwriting
pnpm nx typecheck product-config
pnpm nx lint auth
```

Tests are not configured yet. Current validation is build, typecheck, lint, and manual browser verification.

## Cloudflare Worker Runtime

The Cloudflare runtime lives in `apps/cloudflare-worker/src/index.ts`, with root
configuration in `wrangler.toml`. It uses Workers Static Assets to serve
`dist/apps/shell` through the `ASSETS` binding and runs the Worker first for
`/api/*` and `/remote-assets/*`.

For this prototype, remote release metadata and active pointers are read from the
`REMOTE_REGISTRY` D1 binding to validate the independent remote deployment
concept. In production, the primary backend database should own this registry
instead of Cloudflare D1, so release activation and rollback live with the rest
of the application control plane. Remote artifacts are fetched from the private
`REMOTE_ARTIFACTS` R2 binding after the same session and permission checks pass.
`remoteEntry.js` responses use `Cache-Control: no-store`; other release assets
use private immutable caching after authorization.

The Worker supports a production session validation hook via
`SESSION_VALIDATION_URL`. Until a real backend session endpoint is configured,
local development uses the demo bearer tokens from the mock auth client and sets
a temporary HTTP-only cookie for same-origin remote asset requests.

For local Worker smoke checks:

```bash
pnpm nx build shell
CI=1 pnpm exec wrangler d1 migrations apply REMOTE_REGISTRY --local

REMOTE_ASSET_BASE=/remote-assets/product-config/releases/2026.06.08-step4/ \
pnpm nx build product-config --skip-nx-cache

REMOTE_ASSET_BASE=/remote-assets/underwriting/releases/2026.06.08-step4/ \
pnpm nx build underwriting --skip-nx-cache

for app in product-config underwriting; do
  prefix="remotes/$app/releases/2026.06.08-step4"
  while IFS= read -r file; do
    relative=${file#dist/apps/$app/}
    pnpm exec wrangler r2 object put \
      "ginja-ai-prototype-remote-artifacts/$prefix/$relative" \
      --local \
      --file "$file" \
      --force
  done < <(find "dist/apps/$app" -type f)
done

pnpm dev:worker
```

The seeded D1 release version is `2026.06.08-step4`. This D1 registry is only a
concept-validation stand-in for the production backend-owned registry.

Step 5 release automation is available through these scripts:

```bash
pnpm cf:release:remote product-config --local --activate
pnpm cf:smoke:remote product-config <version> --url http://localhost:8787
pnpm cf:rollback:remote product-config <previous-version> --local
```

Use `--remote` instead of `--local` for deployed Cloudflare D1/R2 resources.
`cf:release:remote` builds the remote with an immutable asset base, uploads
artifacts to R2, registers the release as available in D1, optionally smoke
checks it through the protected gateway, and optionally activates it. The
rollback command is intentionally a validated active-pointer update; it does not
rebuild or redeploy the shell or other remotes.

## Cloudflare Prototype Deployment

Run these from the repository root after installing dependencies and logging in
with Wrangler:

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
```

Create the private remote artifact bucket and D1 registry database:

```bash
pnpm exec wrangler r2 bucket create ginja-ai-prototype-remote-artifacts
pnpm exec wrangler d1 create ginja-ai-prototype-remote-registry
```

Copy the `database_id` printed by `wrangler d1 create` into the
`REMOTE_REGISTRY` binding in `wrangler.toml`. The R2 bucket name is already
configured there.

Apply the registry schema and seed data to the remote D1 database:

```bash
pnpm cf:migrate:remote-registry
```

Build and deploy the shell Worker with Workers Static Assets:

```bash
pnpm cf:deploy:shell
```

Set the deployed Worker origin from the Wrangler output:

```bash
export WORKER_URL="https://<your-worker-origin>"
```

Release and activate each remote independently:

```bash
pnpm cf:release:remote product-config --remote --activate --smoke-url "$WORKER_URL"
pnpm cf:release:remote underwriting --remote --activate --smoke-url "$WORKER_URL"
```

Rollback only changes the active D1 pointer for the selected remote:

```bash
pnpm cf:rollback:remote product-config <previous-version> --remote
pnpm cf:smoke:remote product-config <previous-version> --url "$WORKER_URL"
```

For this prototype, the deployed Worker still accepts the demo bearer tokens and
sets a temporary same-origin session cookie after `/api/runtime/remotes`. The
browser login flow uses those same demo tokens, so the deployed prototype can be
validated before a real `SESSION_VALIDATION_URL` is configured.

## GitHub Actions CI/CD

The repository uses GitHub Actions for both verification and deployment:

- `CI` runs on every pull request and on pushes to `main`.
- It uses `nx affected` so only changed projects, plus their dependents, run `lint`, `typecheck`, and `build`.
- `Deploy` runs after `CI` succeeds on `main`.
- It uses `nx affected` to build only the changed projects, deploys the shell Worker only when the shell, worker, or worker config changed, and releases only the affected remotes with smoke checks.
- Root infra changes such as `wrangler.toml` and migration SQL still trigger the relevant deploy steps even though Nx does not surface them as affected apps.
- `Rollback Validation` is a manual workflow that rolls a remote back to a previous version, smoke-checks the active pointer, and restores the original version unless you opt out.

Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `WORKER_URL`

`WORKER_URL` should point at the deployed Worker origin used by smoke checks, for example a `workers.dev` URL or a custom domain.

## Production Build

Build all apps and packages:

```bash
pnpm build
```

Nx runs each project's `build` target and writes artifacts under `dist/`.

```txt
dist/apps/shell/
dist/apps/product-config/
dist/apps/underwriting/
dist/packages/*
```

For production-style release artifacts, build the shell and each remote
independently:

1. Build the shell:

   ```bash
   pnpm nx build shell
   ```

2. Build each remote with its immutable release base:

   ```bash
   REMOTE_ASSET_BASE=/remote-assets/product-config/releases/<version>/ \
   pnpm nx build product-config

   REMOTE_ASSET_BASE=/remote-assets/underwriting/releases/<version>/ \
   pnpm nx build underwriting
   ```

3. Publish each remote's `dist/apps/<remote>` contents under the corresponding
   private remote release prefix. Production remote builds intentionally omit
   `index.html`; standalone remote apps are for local dev only.

The shell still dynamically requests `remoteEntry.js` only after permission
checks pass. Runtime remote URL selection comes from `/api/runtime/remotes`, not
from shell build-time environment variables.

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

- Product Config cannot import Underwriting.
- Underwriting cannot import Product Config.
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
6. Add the localhost fallback URL in `apps/shell/src/remote-registry.ts` while backend registry support is local-only.
7. Add the remote to the backend `/api/runtime/remotes` source with the required permissions and active remote entry URL.
8. Add matching `requiredPermissions` to the remote manifest.
9. Add any new feature flags to `@ginja/feature-flags`.
10. Add shared singleton dependencies to all app Rsbuild configs if the new remote needs a cross-cutting runtime package.
11. Add any remote-build asset prefix environment variable required by that remote's `rsbuild.config.ts`.
12. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

Do not add the remote to the shell's static `moduleFederation.options.remotes`. That would bypass the no-load-until-authorized behavior.

## Important Source Files

| File | Purpose |
| --- | --- |
| `apps/shell/src/app.tsx` | Runtime registry consumption, permission gate, shell layout, nav, remote routes, error boundaries |
| `apps/shell/src/remote-registry.ts` | Known shell remote route metadata and localhost registry fallback |
| `apps/shell/rsbuild.config.ts` | Shell build config with empty static remotes config |
| `apps/product-config/src/remote/manifest.tsx` | Product Config public remote contract |
| `apps/underwriting/src/remote/manifest.tsx` | Underwriting public remote contract |
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
- Add more vertical modules such as claims, billing, policy administration, or member management.
- Extend CI with tests once they are introduced.
