# Knowledge base — Gym Management

Central folder for **product flows**, **identity/RBAC architecture**, **reuse rules**, and **implementation notes**. Use this before adding features so work extends existing patterns instead of duplicating logic.

**Last updated:** 2026-05-25

---

## Read in this order

| # | Document | Contents |
|---|----------|----------|
| 1 | [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md) | Stack, identity model, routes, sequence flows, API map, reuse catalog, backlog |
| 2 | [REUSE_AND_CONVENTIONS.md](./REUSE_AND_CONVENTIONS.md) | Anti-duplication checklist, frontend/backend patterns, legacy paths to avoid |
| 3 | [USER_ROLE_ARCHITECTURE.md](./USER_ROLE_ARCHITECTURE.md) | Enterprise roles/profiles design, P1 implementation status, provisioning |
| 4 | [SOURCE_CODE_MAP.md](./SOURCE_CODE_MAP.md) | Where key services, pages, and components live in the repo |
| 5 | [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) | Recent P1 changes (Members/Staff, trainer edit, photo reuse) |

---

## Related docs (parent `docs/` folder)

| Document | Contents |
|----------|----------|
| [../CodeWorkflow.md](../CodeWorkflow.md) | HTTP pipeline, JWT, RBAC middleware |
| [../PT_MODULE.md](../PT_MODULE.md) | Personal training packages & sessions |
| [../USER_GUIDE.md](../USER_GUIDE.md) | End-user operations |
| [../PRODUCT_BACKLOG.md](../PRODUCT_BACKLOG.md) | Scheduled product work |
| [../FIREBASE_OTP_PRODUCTION.md](../FIREBASE_OTP_PRODUCTION.md) | Firebase OTP production setup (customer billing) |
| [../RELEASE_PROCESS.md](../RELEASE_PROCESS.md) | UAT → main release and deploy workflow |
| [../../deploy/DEPLOYMENT-UAT.md](../../deploy/DEPLOYMENT-UAT.md) | UAT Docker / Nginx / SSL on VPS |
| [../sql/](../sql/) | SQL scripts (workout builder, exercises) |

---

## For AI assistants

- Repo root: [AGENTS.md](../../AGENTS.md)
- Cursor always-on rule: [.cursor/rules/gym-application-context.mdc](../../.cursor/rules/gym-application-context.mdc)

---

## How to maintain

1. Change a user-visible flow → update [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md) and bump **Last updated** there.
2. Add a shared component or service convention → update [REUSE_AND_CONVENTIONS.md](./REUSE_AND_CONVENTIONS.md) and §10 in APPLICATION_FLOWS.
3. Schema/RBAC/provisioning change → update [USER_ROLE_ARCHITECTURE.md](./USER_ROLE_ARCHITECTURE.md).
4. New “always do X” rule for agents → sync `.cursor/rules/gym-application-context.mdc`.
