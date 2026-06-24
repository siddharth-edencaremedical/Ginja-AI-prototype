# Module Boundaries

## Purpose

This document defines ownership and dependency rules for the prototype. The goal is to let teams evolve vertical business modules independently while still sharing stable platform capabilities.

## Project Categories

The workspace should use these categories:

- Shell app: `apps/shell`
- Vertical apps: `apps/claims`, `apps/finance`
- Horizontal packages: packages under `packages/`

Recommended Nx tags:

```txt
type:app-shell
type:vertical
type:platform
scope:shell
scope:claims
scope:finance
scope:design-system
scope:shared-types
scope:auth
scope:api-client
scope:permissions
scope:logging
scope:feature-flags
```

Use one `type:*` tag and one `scope:*` tag per project.

## Allowed Dependencies

The shell may depend on:

- Horizontal packages
- Remote module manifests exposed through Module Federation

Vertical modules may depend on:

- Horizontal packages
- Their own local domain code

Horizontal packages may depend on:

- Other horizontal packages when the dependency is stable and platform-level
- External libraries approved for that package

Examples:

```txt
apps/shell -> packages/design-system
apps/shell -> packages/auth
apps/claims -> packages/api-client
apps/claims -> packages/shared-types
apps/finance -> packages/permissions
packages/api-client -> packages/auth
```

## Disallowed Dependencies

Vertical modules must not directly depend on other vertical modules.

Disallowed examples:

```txt
apps/claims -> apps/finance
apps/finance -> apps/claims
packages/shared-types -> apps/claims
packages/design-system -> apps/finance
```

Avoid these coupling patterns:

- Direct imports between vertical modules
- Shared mutable frontend state across verticals
- Horizontal packages importing app code
- Domain-specific logic inside platform packages
- Shell code reaching into a remote's internal stores, components, or route files

## Nx Boundary Expectations

Nx dependency rules should enforce the architecture:

- `type:app-shell` can depend on `type:platform`.
- `type:vertical` can depend on `type:platform`.
- `type:platform` can depend only on `type:platform`, unless an exception is recorded in an ADR.
- `scope:claims` cannot depend on `scope:finance`.
- `scope:finance` cannot depend on `scope:claims`.
- Platform packages cannot depend on app scopes.

Module Federation configuration is the integration point between the shell and remote apps. Shell code should not statically import from remote app source. Compile-time types for the remote manifest should come from a horizontal package such as `shared-types`.

## Shared Types

`shared-types` is for stable cross-module contracts only. Keep a type inside a vertical module when it is specific to one business domain.

Move a type to `shared-types` only when:

- At least two modules need the same contract.
- The contract is stable enough to version with the platform.
- The type does not expose one module's internal workflow shape.

## Shared UI

`design-system` owns reusable UI primitives and common app patterns. It should not become a place for business-specific screens.

Allowed in `design-system`:

- Buttons, inputs, dialogs, tables, tabs, forms, layout primitives
- Theme tokens
- App shell layout primitives
- Generic empty, loading, and error states

Not allowed in `design-system`:

- Claims adjudication forms with business rules
- Finance reconciliation review components
- Claims, billing, member, or policy workflow screens
- Domain-specific copy or validation logic

## API and Mocking

Modules should call APIs through `api-client`. Mock transport should live behind that client so a module's access pattern is the same for mock and real APIs.

Domain-specific mock data can live in the owning vertical module when it supports local workflows. Cross-module mock contracts should move behind `api-client` or `shared-types` only when multiple modules need them.

## Boundary Change Process

When a module needs a dependency that violates these rules:

1. Prefer moving a stable contract into a horizontal package.
2. Prefer shell-owned navigation or URL parameters over direct vertical imports.
3. Record a deliberate exception in an ADR if the coupling is unavoidable.
