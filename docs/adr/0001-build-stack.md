# ADR 0001: Build Stack

## Status

Accepted

## Context

The prototype needs to validate a modular insurance SaaS frontend where a host shell loads independently owned business modules. The stack must support monorepo workflows, TypeScript, React, Module Federation, package boundary rules, and a shared Shadcn-based design system.

The goal is architecture validation before deep feature development.

## Decision

Use this baseline stack:

- PNPM workspaces for package management
- Nx for monorepo orchestration, project graph, generators, and dependency boundary rules
- Rsbuild/Rspack for React application builds
- Module Federation for shell-to-remote integration
- TypeScript across apps and packages
- React Router for shell-owned routing
- Tailwind CSS v4 for utility-first styling, configured via `@rsbuild/plugin-tailwindcss` in each app
- shadcn/ui component pattern: Radix UI primitives + `class-variance-authority` + `tailwind-merge`, housed in `packages/design-system`

Rsbuild/Rspack is the frontend application build path for both the shell and remote apps.

## Consequences

- The workspace can model shell, vertical modules, and horizontal packages as first-class projects.
- Nx can enforce boundaries between app shell, vertical modules, and platform packages.
- Module Federation can be configured consistently across the shell and remotes.
- Keeping one app build stack avoids conflicting build assumptions between host and remotes.
- The prototype should defer alternate build tools unless a later ADR replaces this decision.

## Follow-Up

The scaffold should include:

- `apps/shell`
- `apps/claims`
- `apps/finance`
- Platform packages under `packages/`
- Shared React and runtime dependency versions
- Nx tags and dependency constraints matching `docs/module-boundaries.md`
