# Gym Management — Product Backlog & Workflow Guide

Use this document to work through remaining improvements **one item at a time**. Mark items with `[x]` only when **Implemented** in this repo’s source (see status definitions below).

**Last updated:** 2026-10-03 (docs vs source audit)  
**Related docs:** [knowledge-base/README.md](./knowledge-base/README.md) · [APPLICATION_FLOWS.md](./knowledge-base/APPLICATION_FLOWS.md) · [SESSION_HANDOFF.md](./SESSION_HANDOFF.md) (Jun 2026 snapshot — checkboxes there are historical) · [USER_GUIDE.md](./USER_GUIDE.md) · [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) · [deploy/DEPLOYMENT.md](../deploy/DEPLOYMENT.md)

---

## Status definitions (do not collapse these)

| Label | Meaning | How this repo uses it |
|-------|---------|------------------------|
| **Implemented** | Feature exists in source in this tree | Cited file paths |
| **Tested** | Automated tests exist **in-repo** | Named test files / classes |
| **Production configured** | Committed config, ops runbook, or env example **explicitly** enables/sets the thing | `appsettings*.json`, `deploy/*.example`, runbooks — **not** inferred from “the code exists” |
| **Released** | Evidence of a shipped version | Git tags, [RELEASE_PROCESS.md](./RELEASE_PROCESS.md), changelog, release notes |

**Released:** **unknown — no release evidence in repo.** There are **zero git tags**. [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) describes UAT (`uat` branch → https://uat.tigerfitness.tech) then production (`main` → https://tigerfitness.tech). That is a **process**, not proof a given feature was deployed.

**Production configured (committed):** online payments are **off** in `src/GymManagement.API/appsettings.json` (`Commercial:EnableOnlinePayments: false`). Firebase OTP/push is **off** (`Firebase:Enabled: false`). Scheduled outbound reminder webhooks are **off** in `appsettings.Production.json` (`Notifications:EnableScheduledReminders: false`). Docker default `DATABASE_SEED_DEFAULTS` is **false** (`deploy/docker-compose.yml`). Whether live VPS env files match these values is **unknown** (`.env` is not committed).

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [User personas & apps](#2-user-personas--apps)
3. [Member workflow (mobile)](#3-member-workflow-mobile)
4. [Staff / admin workflow (web)](#4-staff--admin-workflow-web)
5. [End-to-end: new member joins](#5-end-to-end-new-member-joins)
6. [Recommended work order](#6-recommended-work-order)
7. [Phase 1 — Critical](#phase-1--critical-security--wrong-user-experience)
8. [Phase 2 — Member mobile](#phase-2--member-mobile-core-gaps)
9. [Phase 3 — Web admin/staff](#phase-3--web-adminstaff-ux--permissions)
10. [Phase 4 — API & data](#phase-4--api--data-consistency)
11. [Phase 5 — Auth & accounts](#phase-5--auth--account-management)
12. [Phase 6 — Mobile UX](#phase-6--mobile-ux--features)
13. [Phase 7 — Web features](#phase-7--web-features-polish)
14. [Phase 8 — Infrastructure](#phase-8--infrastructure--ops-vps)
15. [Phase 9 — Training / AI](#phase-9--training--ai-stack-staff-only)
16. [Phase 10 — Notifications](#phase-10--notifications--engagement)
17. [Phase 11 — Payments](#phase-11--payments--business)
18. [Phase 12 — Quality & testing](#phase-12--quality--testing)
19. [Open product questions](#open-product-questions-preserve)
20. [Implemented (evidence)](#implemented-evidence)
21. [Full checklist](#full-checklist-copy-paste)

---

## 1. Product overview

| Surface | Folder | Audience | Purpose |
|---------|--------|----------|---------|
| **Web app** | `gym_client/` | Admin, staff, trainers, owners, **members (portal)** | Gym operations dashboard + member portal |
| **Mobile app** | `mobile app/` (PulseFit) | **Members** | Self-service: home, workouts, QR check-in, progress |
| **Main API** | `src/GymManagement.API/` | Both | Auth, RBAC, data, `/api/me/*` for members |
| **Exercise API** | `exercise_management_api/` | Web (staff) | Workout studio / AI plan builder (optional Node service) |

**Stack (from project files):** ASP.NET Core **9** (`net9.0` in `src/GymManagement.*.csproj`), React **19** + Vite + TanStack Query (`gym_client/package.json`), EF Core + **SQL Server**. Not Node/PostgreSQL/Prisma for the main app.

**Member web:** Implemented. Login with member persona goes to `/dashboard/member/portal` (`roleRouting.ts` `getPersonaHomePath`). Additional member routes (workouts, diet, progress, pay) live under `/dashboard/member/*`.

**Default seed admin (change in production):** `admin@gym.com` / `admin123` — still in `DatabaseSeeder` (`src/GymManagement.Infrastructure/Data/DatabaseSeeder.cs`). Rotating it on live VPS is **ops** (Phase 1.4).

---

## 2. User personas & apps

| Role | Typical user | Primary app |
|------|----------------|-------------|
| **MEMBER** | Gym customer | Mobile **and** web portal |
| **TRAINER** | Coach | Web (Today panel, assigned clients, training journey) |
| **STAFF** / **RECEPTIONIST** | Front desk | Web (front-desk sidebar + Today’s work) |
| **ADMIN** | Owner / manager | Web (full sidebar) |

**Permission codes (examples):** `TrainerAccess`, `UsersAccess`, `Payments`, `VIEW_ATTENDANCE`, `MANAGE_MEMBERS`, `Reports`, `Config`, `CREATE_MEMBER`. Sidebar grouping: APPLICATION_FLOWS **§12d**.

---

## 3. Member workflow (mobile)

Unchanged in intent. APIs exist on `MeController` (`GET /api/me/dashboard`, workout-plans, diet-plan, attendance, body-metrics, membership, profile, notifications).

**Mobile build (testing):** still `cd "mobile app"` + `flutter build apk` with `--dart-define=API_BASE_URL=…`. Production URL in process docs is `https://tigerfitness.tech` (HTTPS). Whether a given APK was rebuilt against that URL is **unknown — no release evidence**.

---

## 4. Staff / admin workflow (web)

| Step | Area | Notes |
|------|------|--------|
| 1 | Login | `RequireAuth` → `/login` if no valid token. Post-login path by persona (`getPostLoginPath`). |
| 2 | **Members** | `/dashboard/users` (directory). Sidebar section **Members**. |
| 3 | Member detail | `/dashboard/users/:id` — onboarding checklist §5a, membership standing, locker, coach |
| 4 | **Memberships & Billing** | Memberships, Plan catalog, Payments, Collect payment |
| 5 | **Coaching** | Training journey Plan → Assign → Monitor → Review; catalog/audit secondary |
| 6 | **Diet** | Plans + assign |
| 7 | **Attendance & Access** | Logs + scan (`/dashboard/access/scan` / scan routes) |
| 8 | **Retail / Operations / Reports / Settings** | As in §12d |
| 9 | Roles & security | RBAC, devices |

Nav labels **Members**, **Memberships**, **Plan catalog** (not “Users / User membership plans / Membership plan”). Tests: `gym_client/tests/e2e/navigation-personas.spec.ts`.

---

## 5. End-to-end: new member joins

| # | Who | Where | Action |
|---|-----|--------|--------|
| 1 | Staff | Web | Create member (or CSV import — directory only) |
| 2 | Staff | Profile | Onboarding: **Profile → Membership → Payment → Coach → Workout → Diet** |
| 3 | Staff | Collect payment | Review modal → receipt (`§12`) |
| 4 | Member | Mobile or web portal | Login → scan QR / follow workout |
| 5 | Staff | Dashboard | Today’s work / renewal queue |

CSV import does **not** assign membership/coach/workout/diet. Credentials default to **phone as password** when CSV omits password (no invitation-link product path). See APPLICATION_FLOWS **§5a / §5b**.

---

## 6. Recommended work order

Remaining **product** work (implemented items are in [Implemented (evidence)](#implemented-evidence)):

1. **1.4** — Rotate default admin / disable weak seed on production VPS (ops).
2. **Open product questions** — trainer **write** scoping, workout “reviewed” flag, locker ticket assignee, Razorpay merchant idempotency key, opted-out skip **history** rows, invitation vs phone-password.
3. **Razorpay live keys** — source+tests exist; committed config keeps payments **off**. Enabling is ops (`Commercial:*` in server env), not a code gap.
4. **7.4 / 7.5** — Per-member PDF export; bulk workout assignment.
5. **Member portal / a11y polish** — portal exists; dedicated a11y/portal-consistency tests were **not** in the tree at audit time.
6. **4.3** — Paginate/cap `GET /api/me/workout-plans` if lists grow.
7. **Phase 8 remaining ops** — VPS cron, monitoring, confirm Nginx swagger 404 on live hosts.
8. Remaining mobile polish (pull-to-refresh coverage, Play Store keystore).

---

## Phase 1 — Critical (security & wrong-user experience)

| ID | Task | Status |
|----|------|--------|
| 1.1 | Role-based login redirect | **Implemented** — `useLoginMutation.ts` → `getPostLoginPath`; member → `/dashboard/member/portal`. **Tested:** `navigation-personas.spec.ts`. |
| 1.2 | Protect dashboard routes | **Implemented** — `RequireAuth` in `gym_client/src/routes/index.tsx`. Persona path guard: `DashboardRoleProvider` / `DashboardShell`. |
| 1.3 | Sidebar by role/permission | **Implemented** — `navPermissions.ts`, `navSections.ts`, `SidebarNav.tsx`, staff `getStaffFrontDeskNavLinks`. **Tested:** `navigation-personas.spec.ts`. |
| 1.4 | Rotate default admin / prod seed | **Open (ops).** Seeder still creates `admin@gym.com` / `admin123`. Compose default `DATABASE_SEED_DEFAULTS=false`. Live password rotation: **unknown**. |
| 1.5 | HTTPS for production mobile | **Process documented** (`RELEASE_PROCESS.md` uses `https://tigerfitness.tech`). APK rebuild + device verify: **unknown**. |
| 1.6 | Git / deploy pipeline | **Implemented as repo process** — `deploy/scripts/update.sh`, `update-uat.sh`, `.github/workflows/ci.yml`. **Released:** unknown. |

**Checklist**

- [x] 1.1 Role-based login redirect (web) — Implemented + Tested (`navigation-personas.spec.ts`)
- [x] 1.2 Web auth route guard — Implemented (`RequireAuth`)
- [x] 1.3 Web sidebar by role/permission — Implemented + Tested
- [ ] 1.4 Rotate admin password / prod seed — **ops / unverified on live VPS**
- [ ] 1.5 HTTPS + mobile API URL — process docs only; APK produce/release unknown
- [x] 1.6 Deploy scripts + CI in repo — Implemented (not the same as Released)

---

## Phase 2 — Member mobile (core gaps)

| ID | Task | Status |
|----|------|--------|
| 2.1 | Assigned workout plans only | **Implemented** — `MeController` filters via `UserSchedules`. |
| 2.2 | Diet plans on mobile | **Implemented** — `GET /api/me/diet-plan`; Flutter diet screen. |
| 2.3 | Member test account E2E doc | **Partial** — USER_GUIDE + flows; dedicated “create member then phone” runbook still thin. |
| 2.4 | Empty states | **Implemented** (e.g. workouts/diet copy in Flutter screens). Coverage of every tab: not separately tested. |
| 2.5 | QR scan error messages | **Implemented** (API `membership_expired`; mobile maps code — APPLICATION_FLOWS §12b). Device UX: **unverified**. |
| 2.6 | Token refresh on VPS | **Implemented** in clients (`api.ts` refresh; Flutter `ApiClient`). Against production: **unknown**. |

**Checklist**

- [x] 2.1 Mobile: assigned workouts only
- [x] 2.2 Mobile: diet plans
- [ ] 2.3 Member test account E2E doc (staff runbook still open)
- [x] 2.4 Mobile empty states (core screens)
- [x] 2.5 Mobile QR error mapping in source
- [ ] 2.6 Mobile token refresh **verified on production** — unknown

---

## Phase 3 — Web admin/staff (UX & permissions)

| ID | Task | Status |
|----|------|--------|
| 3.1 | Permission-gated nav | **Implemented** — visibility helpers + persona sidebars. **Tested:** `navigation-personas.spec.ts`. |
| 3.2 | Friendly 403 | **Implemented** — `getForbiddenMessage` / `getApiErrorMessage` in `lib/apiErrors.ts`, used from `lib/api.ts`. |
| 3.3 | Onboarding checklist | **Implemented** — Profile→Membership→Payment→Coach→Workout→Diet. `UserOnboardingChecklist`, `MemberOnboardingRules`. **Tested:** `MemberOnboardingRulesTests`, `member-onboarding.spec.ts`. |
| 3.4 | Trainer limited menu | **Implemented** — trainer persona nav §12d. **Tested:** `navigation-personas.spec.ts`. |
| 3.5 | Staff front-desk menu | **Implemented** — §12c. **Tested:** `navigation-personas.spec.ts`. |

**Checklist**

- [x] 3.1 PermissionGate / permission helpers on nav sections
- [x] 3.2 Web friendly 403 handling
- [x] 3.3 User detail onboarding checklist UI
- [x] 3.4 Trainer limited menu
- [x] 3.5 Staff front-desk menu

---

## Phase 4 — API & data consistency

| ID | Task | Status |
|----|------|--------|
| 4.1 | Member diet endpoints | **Implemented** — `GET /api/me/diet-plan`. |
| 4.2 | Member log body metrics | **Implemented** — `POST /api/me/body-metrics`. |
| 4.3 | Workout plans pagination | **Open** — `GET /api/me/workout-plans` has no `pageSize` in `MeController`. |
| 4.4 | Exercise API DB name | **Ops / deploy env** — `deploy/.env` not committed. Example files exist. Live alignment: **unknown**. |
| 4.5 | Notifications mark read | **Implemented** — `POST /api/me/notifications/{id}/read` (not PATCH). Mobile + member web. |
| 4.6 | Membership expiry on scan | **Implemented** — `UserMembershipRules.AllowsGymCheckIn` / `GymQrService`. |

**Checklist**

- [x] 4.1 API GET /api/me/diet-plan
- [x] 4.2 API POST /api/me/body-metrics
- [ ] 4.3 API workout plans pagination
- [ ] 4.4 Exercise API DB alignment (ops; not verified)
- [x] 4.5 Notifications mark read (`POST …/read`)
- [x] 4.6 Membership expiry on scan

---

## Phase 5 — Auth & account management

| ID | Task | Status |
|----|------|--------|
| 5.1 | Forgot password (web) | **Implemented** — `/login/forgot-password`, `POST /api/Auth/forgot-password`, queues `ForgotPasswordOTP` template. Delivery depends on SMTP/channel **Ready**. |
| 5.2 | Forgot password (mobile) | **Implemented** — Flutter `forgot_password_screen.dart`. |
| 5.3 | Change password | **Implemented** — `POST /api/Auth/change-password`; web `ChangePasswordCard`; mobile change-password screen. |
| 5.4 | Member self-registration | **Implemented** (optional flag) — `/signup`, `POST /api/public/signup`. Default `EnableSelfSignup: true` in `appsettings.json`. Production section omitted in `appsettings.Production.json` — **unknown** on live. |
| 5.5 | Logout all devices | **Implemented** — `POST /api/me/devices/logout-all`; Security page + mobile. Live verify: **unknown**. |

**Checklist**

- [x] 5.1 Forgot password web
- [x] 5.2 Forgot password mobile
- [x] 5.3 Change password profile
- [x] 5.4 Member self-registration (feature-flagged)
- [ ] 5.5 Logout all devices **verified** on production — unknown

---

## Phase 6 — Mobile UX & features

| ID | Task | Status |
|----|------|--------|
| 6.1 | Safe area + floating bottom nav | **Implemented** (prior). |
| 6.2 | Pull-to-refresh all tabs | **Open / unverified** — sync helpers exist; Home is not using `RefreshIndicator` in `home_screen.dart`. |
| 6.3 | Profile edit | **Implemented** — `profile_edit_sheet.dart`. |
| 6.4 | Workout history | **Implemented** — `GET /api/me/workout-sessions`. |
| 6.5 | Body metrics charts | **Partial** — metrics APIs + Progress tab exist; chart quality not separately tested. |
| 6.6 | Post-QR success UX | **Unverified** as complete product UX. |
| 6.7 | Offline workout sync | **Implemented** in source; **Tested:** `mobile app/test/workout_recovery_test.dart`. Runtime quality still a product concern. |
| 6.8 | App package name | **Implemented** — `applicationId = "com.pulsefit.member"` (`android/app/build.gradle.kts`). |
| 6.9 | Android release keystore | **Open** (Play distribution). |

**Checklist**

- [x] 6.1 Safe area + floating bottom nav
- [ ] 6.2 Pull-to-refresh all tabs
- [x] 6.3 Mobile profile edit
- [x] 6.4 Workout history API + UI
- [ ] 6.5 Body metrics charts (polish / verify)
- [ ] 6.6 Post-QR success UX
- [x] 6.7 Offline workout sync (source + widget test)
- [x] 6.8 App package name (`com.pulsefit.member`)
- [ ] 6.9 Android release keystore

---

## Phase 7 — Web features (polish)

| ID | Task | Status |
|----|------|--------|
| 7.1 | Minimal member web portal | **Implemented** — `MemberPortalPage` `/dashboard/member/portal`. **No dedicated portal/a11y Playwright spec in tree** at audit time (leave polish open). |
| 7.2 | Help link in mobile | **Implemented** — Profile → Help & support opens web `/help` in-app when a real URL exists, plus stored gym contact from `GET /api/me/support`. **Tested:** `mobile app/test/profile_help_privacy_test.dart`. |
| 7.3 | Bulk import members | **Implemented** — `MemberCsvImportModal`, `POST /api/Users/bulk-import/preview` + `/bulk-import`. **Tested:** `BulkMemberImportEvaluatorTests`, `member-csv-import.spec.ts`. |
| 7.4 | Export member report | **Partial** — directory **CSV** export on `UsersPage` (`members-export-*.csv`). Per-member **PDF** report still open. |
| 7.5 | Bulk workout assignment | **Open**. |
| 7.6 | Diet reminder notifications | **Implemented** — notification engine + templates. Production channel **Ready**: ops. |

**Checklist**

- [x] 7.1 Minimal member web portal (source). Portal consistency / a11y: **open / unverified**
- [x] 7.2 Help link in mobile
- [x] 7.3 Bulk member import (server preview)
- [ ] 7.4 Export member report (PDF); directory CSV exists
- [ ] 7.5 Bulk workout assignment
- [x] 7.6 Diet reminder notifications (engine in source)

---

## Phase 8 — Infrastructure & ops (VPS)

| ID | Task | Status |
|----|------|--------|
| 8.1 | Docker deploy (testing/UAT) | **Implemented** in `deploy/`. **Released:** unknown. |
| 8.2 | Database seed script | **Implemented** — `deploy/scripts/seed.sh`. |
| 8.3 | Automated backups | Script `deploy/scripts/backup.sh` **exists**. Crontab on VPS: **unknown**. |
| 8.4 | Monitoring | **Open / unknown** on VPS. |
| 8.5 | Disable auto-seed in prod | **Documented + compose default false**. Live `.env`: **unknown**. |
| 8.6 | Swagger off in prod | API **always maps** `/swagger` in `Program.cs`. Runbook says Nginx 404 (`deploy/DEPLOYMENT.md`, `PRODUCTION_CHECKLIST.md`). Live Nginx: **unknown**. |
| 8.7 | Domain + SSL | **Documented** in RELEASE_PROCESS. Certificate on servers: **unknown from this repo**. |
| 8.8 | CI pipeline | **Implemented** — `.github/workflows/ci.yml` (.NET 9 tests, frontend typecheck/lint/build, Playwright smoke). |

**Checklist**

- [x] 8.1 Docker deploy pack in repo
- [x] 8.2 Database seed script
- [ ] 8.3 VPS backup **cron** (script only)
- [ ] 8.4 VPS monitoring
- [ ] 8.5 Disable auto-seed in prod **verified on live env**
- [ ] 8.6 Swagger off in prod (verify Nginx; API still serves Swagger)
- [ ] 8.7 Domain SSL production **verified**
- [x] 8.8 CI pipeline (GitHub Actions in repo)

---

## Phase 9 — Training / AI (staff-only)

| ID | Task | Status |
|----|------|--------|
| 9.1 | Document exercise API | **Partial** — `deploy/DEPLOYMENT.md` mentions Node exercise API. Dedicated module doc still missing (`docs/modules/*.md` backlog). |
| 9.2 | Verify exercise-api proxy | **Ops / unknown** on VPS. |
| 9.3 | Fallback when API down | **Unverified**. |
| 9.4 | Merge exercise API into .NET | **Optional / open**. |

**Checklist**

- [ ] 9.1 Document exercise API (dedicated)
- [ ] 9.2 Verify exercise-api proxy
- [ ] 9.3 Exercise API fallback UI
- [ ] 9.4 Merge exercise API (optional)

---

## Phase 10 — Notifications & engagement

| ID | Task | Status |
|----|------|--------|
| 10.1 | Firebase FCM | **Implemented** in source — token `POST /api/me/push-token`, `MemberPushNotificationService`. Committed `Firebase:Enabled: false`. **Production configured:** no. **Tested:** no dedicated FCM test class found. |
| 10.2 | Membership expiry reminders | **Implemented** — hosted services + templates. Production scheduled webhooks **off** in `appsettings.Production.json`. |
| 10.3 | Workout day reminders | **Implemented** — `WorkoutDayReminderHostedService`. Toggle `Notifications:EnableWorkoutDayReminders`. |
| 10.4 | In-app notification center | **Implemented** — mobile `/notifications`; web `MemberNotificationsPanel`. |

Channel status UI: `/dashboard/settings/notifications`. **Tested:** `NotificationChannelReadinessTests`, `notification-settings.spec.ts`.

**Checklist**

- [x] 10.1 Push send path in source (keys/ops still required)
- [x] 10.2 Membership expiry reminders (in-app + outbound when channels Ready)
- [x] 10.3 Workout day reminders (source)
- [x] 10.4 Notification center mobile (+ member web panel)

---

## Phase 11 — Payments & business

| ID | Task | Status |
|----|------|--------|
| 11.1 | Payment gateway | **Implemented** — `IOnlinePaymentService` / `RazorpayOnlinePaymentService` (not `ICommercialServices`). **Tested:** `RazorpayPaymentRulesTests`, `RazorpayOnlinePaymentServiceTests`. **Production configured:** `EnableOnlinePayments: false` in committed `appsettings.json`. **Released:** unknown. |
| 11.2 | Member invoices (mobile) | **Implemented** — `GET /api/me/invoices`. |
| 11.3 | Renew / pay in app | **Implemented** — `/dashboard/member/pay`, blocked-member pay modal, mobile billing card. |

Staff collect-payment UX (review modal, double-submit guard, receipt): **Implemented + Tested** (`payment-collection.spec.ts`, `MembershipBillingTotalsTests`). Standing: `membershipStanding.ts`, `MembershipStandingPanel`; **Tested:** `membership-standing.spec.ts`.

**Checklist**

- [x] 11.1 Razorpay order/verify/webhook/reconcile in source + unit tests; live keys **not** in committed config
- [x] 11.2 Member invoices mobile
- [x] 11.3 Renew / pay membership in app (web + mobile surfaces)

---

## Phase 12 — Quality & testing

| ID | Task | Status |
|----|------|--------|
| 12.1 | Playwright E2E | **Implemented** — `gym_client/tests/e2e/*.spec.ts` + CI smoke job. Against staging VPS: **not claimed**. |
| 12.2 | API tests | **Partial** — `tests/GymManagement.Core.Tests` are **unit** tests (rules/services). No separate API integration project found. |
| 12.3 | Flutter tests | **Partial** — `workout_recovery_test.dart` only (plus that recovery coverage). |
| 12.4 | Test matrix doc | **Partial** — `docs/APPLICATION_AND_MOBILE_REVIEW_2026-10-02.md` is a source review, not a per-role test matrix. |
| 12.5 | VPS load test | **Open**. |

**Checklist**

- [x] 12.1 Playwright E2E **in repo** (plus CI smoke)
- [ ] 12.2 API **integration** tests (unit tests exist)
- [ ] 12.3 Flutter tests (only recovery test)
- [ ] 12.4 Test matrix doc
- [ ] 12.5 VPS load test

---

## Open product questions (preserve)

Do **not** treat these as done:

- **Coach write scoping:** reads are scoped for trainer-only `TrainerAccess`; writes (`POST/DELETE` trainer clients, `UserInstructors`, `UserSchedules` writes, PT book, `PUT/DELETE Trainers/{id}`) still accept any target with `TrainerAccess` (APPLICATION_FLOWS §7b / §14).
- **Workout “reviewed” flag** so trainer Today can show a true unreviewed queue (§7b).
- **Locker maintenance assignee** — tickets have no assigned-staff field; UI shows locker area only.
- **Invitation vs phone-password** — CSV/create still default password to phone; no invite/setup-link product path.
- **Razorpay Idempotency-Key** — no HTTP `Idempotency-Key` usage found. Dedup is order reuse + processing claim + signature (`RazorpayPaymentRules`). Confirm whether Razorpay merchant idempotency headers are required.
- **Opted-out skip recording:** outbound is skipped when `ReceiveEmailNotifications` / `ReceiveSmsNotifications` is off (`NotificationEventService.QueueForUserAsync` returns without enqueue). History **Skipped** is displayed when recorded; opted-out paths often **do not write** a skip history row. Decide if ops need an audit skip.
- **Member portal consistency / web a11y:** portal exists; dedicated follow-up tests were **not** in the tree at this audit.

---

## Implemented (evidence)

Recent product work (source + tests). **Not Released.** **Production configured** only where a committed flag is cited.

| Theme | Implemented | Tested | Production configured |
|-------|-------------|--------|------------------------|
| Sidebar sections (Overview … Settings); labels Members / Memberships / Plan catalog | `navSections.ts`, `SidebarNav.tsx`, `navPermissions.ts` | `tests/e2e/navigation-personas.spec.ts` | unknown |
| Member onboarding Profile→…→Diet | `UserOnboardingChecklist.tsx`, `lib/memberOnboarding.ts`, `MemberOnboardingRules` | `MemberOnboardingRulesTests.cs`, `tests/e2e/member-onboarding.spec.ts` | unknown |
| Membership standing | `lib/membershipStanding.ts`, `MembershipStandingPanel` | `tests/e2e/membership-standing.spec.ts` | unknown |
| Collect payment review / double-submit / receipt | `PaymentConfirmationModal`, collect page | `tests/e2e/payment-collection.spec.ts`, `MembershipBillingTotalsTests.cs` | unknown |
| Razorpay hardening | `RazorpayOnlinePaymentService`, `RazorpayPaymentRules`, `IOnlinePaymentService` | `RazorpayPaymentRulesTests.cs`, `RazorpayOnlinePaymentServiceTests.cs` | **No** — `EnableOnlinePayments: false` in committed `appsettings.json` |
| Owner/front-desk Today’s work | `DailyWorkListPanel`, `lib/dailyWorkList.ts` | `tests/e2e/dashboard-daily-work.spec.ts` | unknown |
| Trainer Today | `TrainerTodayPanel`, `GET /api/trainers/me/today` | `TrainerDayRulesTests.cs`, `tests/e2e/trainer-dashboard.spec.ts` | unknown |
| Training journey Plan→Assign→Monitor→Review | sidebar + training routes | `tests/e2e/training-journey.spec.ts` | unknown |
| CSV import server preview | `POST /api/Users/bulk-import/preview` | `BulkMemberImportEvaluatorTests.cs`, `tests/e2e/member-csv-import.spec.ts` | unknown |
| Notification channel status + delivery | `NotificationChannelsPage`, templates outbox | `NotificationChannelReadinessTests.cs`, `tests/e2e/notification-settings.spec.ts` | SMTP/SMS **Ready** is gym DB + env, not this audit |
| Ops overdue / retail low stock | gym-ops + locker + retail alerts | `tests/e2e/ops-work-visibility.spec.ts` (`@ops-work`) | unknown |

Flows: APPLICATION_FLOWS **§5a, §5b, §7b, membership standing under §11b, §12 collect payment, §12d, §12e, §12f, §14d**, plus notifications under **§12b**.

---

## Full checklist (copy-paste)

```
PHASE 1 — CRITICAL
[x] 1.1  Web role-based login redirect
[x] 1.2  Web auth route guard
[x] 1.3  Web sidebar by role/permission
[ ] 1.4  Rotate admin password / prod seed (ops)
[ ] 1.5  HTTPS + mobile API URL verified
[x] 1.6  Deploy scripts + CI in repo

PHASE 2 — MEMBER MOBILE
[x] 2.1  Mobile: assigned workouts only
[x] 2.2  Mobile: diet plans
[ ] 2.3  Member test account E2E doc
[x] 2.4  Mobile empty states (core)
[x] 2.5  Mobile QR error mapping
[ ] 2.6  Mobile token refresh verify on prod

PHASE 3 — WEB ADMIN/STAFF
[x] 3.1  Permission-gated nav sections
[x] 3.2  Web friendly 403 handling
[x] 3.3  User detail onboarding checklist UI
[x] 3.4  Trainer limited menu
[x] 3.5  Staff front-desk menu

PHASE 4 — API & DATA
[x] 4.1  API GET /api/me/diet-plan
[x] 4.2  API POST /api/me/body-metrics
[ ] 4.3  API workout plans pagination
[ ] 4.4  Exercise API DB alignment
[x] 4.5  Notifications mark read
[x] 4.6  Membership expiry on scan

PHASE 5 — AUTH
[x] 5.1  Forgot password web
[x] 5.2  Forgot password mobile
[x] 5.3  Change password profile
[x] 5.4  Member self-registration (flagged)
[ ] 5.5  Logout all devices verify on prod

PHASE 6 — MOBILE UX
[x] 6.1  Safe area + floating bottom nav
[ ] 6.2  Pull-to-refresh all tabs
[x] 6.3  Mobile profile edit
[x] 6.4  Workout history API + UI
[ ] 6.5  Body metrics charts polish
[ ] 6.6  Post-QR success UX
[x] 6.7  Offline workout sync (source + recovery test)
[x] 6.8  App package name
[ ] 6.9  Android release keystore

PHASE 7 — WEB POLISH
[x] 7.1  Minimal member web portal (a11y/consistency still open)
[x] 7.2  Help link in mobile
[x] 7.3  Bulk member import
[ ] 7.4  Export member PDF report (directory CSV exists)
[ ] 7.5  Bulk workout assignment
[x] 7.6  Diet reminder notifications

PHASE 8 — INFRASTRUCTURE
[x] 8.1  Docker deploy pack
[x] 8.2  Database seed script
[ ] 8.3  VPS backup cron
[ ] 8.4  VPS monitoring
[ ] 8.5  Disable auto-seed in prod verified
[ ] 8.6  Swagger off in prod verified
[ ] 8.7  Domain SSL production verified
[x] 8.8  CI pipeline

PHASE 9 — TRAINING / AI
[ ] 9.1  Document exercise API
[ ] 9.2  Verify exercise-api proxy
[ ] 9.3  Exercise API fallback UI
[ ] 9.4  Merge exercise API (optional)

PHASE 10 — NOTIFICATIONS
[x] 10.1 Push path in source (Firebase prod keys unknown)
[x] 10.2 Membership expiry reminders
[x] 10.3 Workout day reminders
[x] 10.4 Notification center mobile

PHASE 11 — PAYMENTS
[x] 11.1 Razorpay in source + unit tests (live enable unknown)
[x] 11.2 Member invoices mobile
[x] 11.3 Renew / pay in app

PHASE 12 — TESTING
[x] 12.1 Playwright E2E in repo
[ ] 12.2 API integration tests
[ ] 12.3 Flutter tests (beyond recovery)
[ ] 12.4 Test matrix doc
[ ] 12.5 VPS load test
```

---

## Notes

- **Released** is never inferred from compile success or UAT URLs in docs.
- Jun 2026 [SESSION_HANDOFF.md](./SESSION_HANDOFF.md) is a historical snapshot; this file is the scheduled backlog.
- Cross-cutting refactors: APPLICATION_FLOWS **§14 Improvement backlog**.
