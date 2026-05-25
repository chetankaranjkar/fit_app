# Agent guide — Gym Management

This repo is a **.NET 9 API + React (Vite) client + SQL Server** gym management system.

## Start here

| Document | Why |
|----------|-----|
| [docs/knowledge-base/README.md](docs/knowledge-base/README.md) | **Index** — read docs in order |
| [docs/knowledge-base/APPLICATION_FLOWS.md](docs/knowledge-base/APPLICATION_FLOWS.md) | End-to-end flows, routes, identity model, shared components |
| [docs/knowledge-base/REUSE_AND_CONVENTIONS.md](docs/knowledge-base/REUSE_AND_CONVENTIONS.md) | How to avoid duplicated code |
| [docs/knowledge-base/USER_ROLE_ARCHITECTURE.md](docs/knowledge-base/USER_ROLE_ARCHITECTURE.md) | Roles, Members, Staff, Trainers, provisioning |
| [docs/knowledge-base/SOURCE_CODE_MAP.md](docs/knowledge-base/SOURCE_CODE_MAP.md) | Key file paths |
| [docs/CodeWorkflow.md](docs/CodeWorkflow.md) | HTTP, JWT, permissions middleware |

Cursor also loads `.cursor/rules/gym-application-context.mdc` automatically.

## Run locally

- API: `src/GymManagement.API` (see `appsettings.Development.json` for DB)
- Client: `gym_client/` — `npm run dev`
- DB migrate: `dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API`

## When implementing

1. Read the flow doc section for your module.
2. Reuse existing services/components (see reuse catalog).
3. Update `docs/knowledge-base/APPLICATION_FLOWS.md` if you add or change a user-visible flow.
