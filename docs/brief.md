# Insurance SaaS Prototype

## Purpose

Create a high-level prototype for an insurance SaaS platform using a monorepo, an app shell, and Module Federation.

The goal is to explore architecture, team boundaries, and module ownership before building detailed features.

---

## Architecture

The platform will use an App Shell that loads multiple modules.

```txt
App Shell
├── Vertical Modules
└── Horizontal Modules
```

---

## App Shell

The App Shell is the main host application.

It will handle:

- Global layout
- Navigation
- Routing
- Authentication state
- Loading remote modules

---

## Vertical Modules

Vertical modules are business-facing insurance domains.

Initial examples:

- Claims
- Finance
- Policy Administration
- Billing
- Member Management

Each vertical module should be able to evolve independently.

---

## Horizontal Modules

Horizontal modules are shared platform capabilities.

Initial examples:

- Design System
- Shared Types
- Authentication
- API Client
- Permissions 
- Logging
- Feature Flags


These modules support the whole platform and are reused by vertical modules.

---

## Module Federation

Module Federation will be used so that the App Shell can load vertical modules as remotes.

The shell owns the platform experience.

The remotes own their business areas.

```txt
Shell
├── loads Claims
└── loads Finance
```

---

## Monorepo Structure

The prototype will be organized as a monorepo.

```txt
apps/
  shell/
  claims/
  finance/

packages/
  design-system/
  shared-types/
  auth/
  api-client/
```

---

## Stack

### Frontend

- React
- TypeScript
- Module Federation
- React Router
- Strictly Shadcn
- PNPM workspaces
- Rsbuild
- Nx

### Repository

- Monorepo
- Apps under `apps/`
- Shared packages under `packages/`

### Testing

Testing can be added later using:

- Vitest
- React Testing Library
- Playwright

---

## Development Goal

Each team should be able to work on its own module without needing to understand or change the entire platform.

A module should be able to:

- Run independently
- Run inside the shell
- Reuse shared packages
- Own its business logic

---

## Guiding Principle

The product should feel like one application to the user, while allowing teams to build separate business modules independently.
