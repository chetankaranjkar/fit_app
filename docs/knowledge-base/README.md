# Knowledge base — Gym Management

Central folder for **product flows**, **identity/RBAC architecture**, **reuse rules**, and **implementation notes**. Use this before adding features so work extends existing patterns instead of duplicating logic.

**Last updated:** 2026-10-04

---

## Read in this order

| # | Document | Contents |
|---|----------|----------|
| 1 | [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md) | Stack, identity model, routes, sequence flows, API map, reuse catalog, backlog |
| 2 | [REUSE_AND_CONVENTIONS.md](./REUSE_AND_CONVENTIONS.md) | Anti-duplication checklist, frontend/backend patterns, legacy paths to avoid |
| 3 | [USER_ROLE_ARCHITECTURE.md](./USER_ROLE_ARCHITECTURE.md) | Enterprise roles/profiles design, P1/P2 implementation status, provisioning |
| 4 | [SOURCE_CODE_MAP.md](./SOURCE_CODE_MAP.md) | Where key services, pages, and components live in the repo |
| 5 | [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) | P1 identity snapshot (Members/Staff, trainer edit, photo reuse) |
| 6 | [UI_DATA_GRID_AUDIT.md](./UI_DATA_GRID_AUDIT.md) | Enterprise data grid, fixed dashboard layout, migrated list pages |

---

## APPLICATION_FLOWS section map

Headings in [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md) are **not strictly sequential** (legacy numbering). Use this map:

| § | Topic |
|---|--------|
| 1 | Stack |
| 2 | High-level architecture |
| 3 | Identity model |
| 4 | Frontend dashboard routes (members/trainers) |
| 5 | Create gym member |
| **5a** | **Member onboarding checklist** (Profile → Membership → Payment → Coach → Workout → Diet) |
| **5b** | **CSV member import** (server preview) |
| 6 | Create / link trainer |
| 7 | Assign member to coach |
| **7b** | **Trainer dashboard — Today** (`GET /api/trainers/me/today`) |
| 8 | Edit trainer profile UI |
| 9 | Login & permissions (OTP, password, member portal redirect) |
| **9b** | **Member web portal** |
| **9c** | **Mobile diet / food search / workout tip** (assigned vs recorded; no fake AI) |
| **9d** | **Mobile Profile Help & Privacy** |
| **9e** | **Mobile home (PulseFit)** — scan, today’s workout, membership/payment |
| **9f** | **Mobile accessibility** (plain labels, shared text/touch/keyboard helpers) |
| 10 | Reuse catalog |
| 11 | API quick reference |
| **11b** | User memberships (one occupying membership) + **membership standing** |
| 11c | Membership lifecycle (no delete) |
| **12** | Enterprise billing + **collect payment** (review modal, receipt) |
| 12b | QR check-in gate; **notifications** (channel status, SMTP/SMS, templates, Razorpay member pay) |
| 12c | Staff front-desk menu |
| **12d** | **Web sidebar sections** (Overview … Settings; Plan → Assign → Monitor → Review) |
| **12e** | **Dashboard daily work** (“Today’s work”) |
| **12f** | **Operations & retail overdue / low stock** |
| 13 | Device management & session security |
| 14 (live workout) | Member execution tracking |
| 14b–14c | Personal plans audit; categories / warmups / stretches |
| **14d** | **Web training journey** |
| 14 (improvement backlog) | Cross-cutting open refactors |
| 15 (health) | Health profile screening |
| 15 (maintain) | How to update this doc |
| 16 | Supplement tracking |

Scheduled product work and **Implemented / Tested / Production configured / Released** rules: [../PRODUCT_BACKLOG.md](../PRODUCT_BACKLOG.md).

---

## Related docs (parent `docs/` folder)

| Document | Contents |
|----------|----------|
| [../CodeWorkflow.md](../CodeWorkflow.md) | HTTP pipeline, JWT, RBAC middleware |
| [../PT_MODULE.md](../PT_MODULE.md) | Personal training packages & sessions |
| [../USER_GUIDE.md](../USER_GUIDE.md) | End-user operations |
| [../PRODUCT_BACKLOG.md](../PRODUCT_BACKLOG.md) | Scheduled product work + evidence status |
| [../FIREBASE_OTP_PRODUCTION.md](../FIREBASE_OTP_PRODUCTION.md) | Firebase OTP production setup (customer billing) |
| [../RELEASE_PROCESS.md](../RELEASE_PROCESS.md) | UAT → main release, deploy, mobile APK HTTPS/signing |
| [../PERFORMANCE_IMPLEMENTATION.md](../PERFORMANCE_IMPLEMENTATION.md) | Performance work shipped (paging, dashboard summary, caching) |
| [../NOTIFICATION_WEBHOOKS.md](../NOTIFICATION_WEBHOOKS.md) | Email/WhatsApp webhook reminders (n8n, env vars, payloads) |
| [../PERFORMANCE_AUDIT_REPORT.md](../PERFORMANCE_AUDIT_REPORT.md) | Performance audit findings |
| [../APPLICATION_AND_MOBILE_REVIEW_2026-10-02.md](../APPLICATION_AND_MOBILE_REVIEW_2026-10-02.md) | Source review (not a test matrix; not production proof) |
| [../../deploy/DEPLOYMENT-UAT.md](../../deploy/DEPLOYMENT-UAT.md) | UAT Docker / Nginx / SSL on VPS |
| [../sql/](../sql/) | SQL scripts (workout builder, exercises) |

---

## For AI assistants

- Repo root: [AGENTS.md](../../AGENTS.md)
- Cursor always-on rule: [.cursor/rules/gym-application-context.mdc](../../.cursor/rules/gym-application-context.mdc)

---

## How to maintain

1. Change a user-visible flow → update [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md) (and this section map if you add a heading) and bump **Last updated** there.
2. Add a shared component or service convention → update [REUSE_AND_CONVENTIONS.md](./REUSE_AND_CONVENTIONS.md) and §10 in APPLICATION_FLOWS.
3. Schema/RBAC/provisioning change → update [USER_ROLE_ARCHITECTURE.md](./USER_ROLE_ARCHITECTURE.md).
4. New “always do X” rule for agents → sync `.cursor/rules/gym-application-context.mdc`.
5. Schedule or close product work → [../PRODUCT_BACKLOG.md](../PRODUCT_BACKLOG.md) using Implemented / Tested / Production configured / Released — never mark Released from source alone.
