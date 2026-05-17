# Gym Management — Product Backlog & Workflow Guide

Use this document to work through improvements **one item at a time**. Mark items with `[x]` when done.

**Last updated:** May 2026  
**Related docs:** [USER_GUIDE.md](./USER_GUIDE.md) · [deploy/DEPLOYMENT.md](../deploy/DEPLOYMENT.md) · [deploy/DEPLOYMENT-TESTING.md](../deploy/DEPLOYMENT-TESTING.md)

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
19. [Full checklist (copy-paste)](#full-checklist-copy-paste)

---

## 1. Product overview

| Surface | Folder | Audience | Purpose |
|---------|--------|----------|---------|
| **Web app** | `gym_client/` | Admin, staff, trainers, owners | Full gym operations dashboard |
| **Mobile app** | `mobile app/` (PulseFit) | **Members** (gym users) | Self-service: home, workouts, QR check-in, progress |
| **Main API** | `src/GymManagement.API/` | Both | Auth, RBAC, data, `/api/me/*` for mobile |
| **Exercise API** | `exercise_management_api/` | Web (staff) | Workout studio, AI plan builder (optional service) |

**Important:** There is **no dedicated member web portal** today. Web login sends everyone to `/dashboard`.

**Test VPS (HTTP):** `http://187.127.169.135`  
**Default admin (change in production):** `admin@gym.com` / `admin123`

---

## 2. User personas & apps

| Role | Typical user | Primary app |
|------|----------------|-------------|
| **MEMBER** | Gym customer | **Mobile** (intended) |
| **TRAINER** | Coach | Web (training, assignments) |
| **STAFF** | Front desk / ops | Web (attendance, scan, members) |
| **ADMIN** | Owner / manager | Web (all features + analytics, roles) |

**Permission codes (examples):** `TrainerAccess`, `UsersAccess`, `Payments`, `VIEW_ATTENDANCE`, `MANAGE_MEMBERS`, `Reports`, `Config`, `CREATE_MEMBER`.

---

## 3. Member workflow (mobile)

| Step | Screen / action | API |
|------|-----------------|-----|
| 1 | Splash → login | `POST /api/Auth/login` |
| 2 | **Home** — dashboard summary | `GET /api/me/dashboard` |
| 3 | **QR scan** — gym check-in | `POST /api/attendance/scan` |
| 4 | **Workouts** — browse plans | `GET /api/me/workout-plans` |
| 5 | Plan detail → **live session** | `GET /api/me/workout-plans/{id}/session` |
| 6 | Complete workout | `POST /api/me/workout-sessions/complete` |
| 7 | **Progress** — attendance + body metrics | `GET /api/me/attendance`, `/api/me/body-metrics` |
| 8 | **Membership** | `GET /api/me/membership` |
| 9 | **Profile** | `GET /api/me/profile` |

**Mobile build (testing VPS):**

```bash
cd "mobile app"
flutter build apk --release --dart-define=API_BASE_URL=http://187.127.169.135
```

APK: `mobile app/build/app/outputs/flutter-apk/app-release.apk`

---

## 4. Staff / admin workflow (web)

| Step | Area | Notes |
|------|------|--------|
| 1 | Login → `/dashboard` | No role-based redirect today |
| 2 | **Users** | Create member, profile, metrics |
| 3 | **User detail** | Assign membership, workout schedules, diet |
| 4 | **Training** | Body parts, exercises, plans, assignments |
| 5 | **Diet** | Plans + assign to users |
| 6 | **Attendance** | Logs + **Scan to enter** (`/dashboard/access/scan`) |
| 7 | **Payments** | Plans, memberships, invoices |
| 8 | **Access** | Branches, owner QR, door device |
| 9 | **Gym ops / lockers / analytics** | Equipment, expenses, owner dashboards |
| 10 | **Roles & security** | RBAC, compromised sessions |

---

## 5. End-to-end: new member joins

| # | Who | Where | Action |
|---|-----|--------|--------|
| 1 | Admin | Web | Create user + auth account |
| 2 | Admin | Web | Assign membership plan + dates |
| 3 | Admin | Web | Assign workout plan(s) on user detail |
| 4 | Admin | Web | Optionally assign diet plan |
| 5 | Admin | Web | Record body metrics / assign trainer |
| 6 | Member | Mobile | Login → scan QR at gym |
| 7 | Member | Mobile | Follow workout → log session |
| 8 | Staff | Web | Review attendance / progress |

---

## 6. Recommended work order

Work in this sequence for the fastest impact:

1. **1.1 → 1.3** — Web: members stop landing in admin UI  
2. **1.4 → 1.5** — Production security (password, HTTPS)  
3. **2.1 → 2.2** — Mobile: assigned workouts + diet  
4. **2.3** — Create real member and test end-to-end  
5. **3.1 → 3.2** — Web permissions polish  
6. **4.1 → 4.2** — API for diet + member body metrics  
7. **5.1 → 5.3** — Password flows  
8. **6.4 → 6.6** — Mobile history & polish  
9. **8.3 → 8.5** — VPS maintenance  
10. Remaining items by business priority  

---

## Phase 1 — Critical (security & wrong-user experience)

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 1.1 | Role-based login redirect (web) | `gym_client/src/features/auth/hooks/useLoginMutation.ts` | `ADMIN`/`STAFF`/`TRAINER` → `/dashboard`; `MEMBER` → member page or “use mobile app” |
| 1.2 | Protect dashboard routes (web) | `gym_client/src/routes/` + layout | No token → `/login`; optional role checks |
| 1.3 | Sidebar menu by role/permission | `gym_client/src/components/layout/SidebarNav.tsx` | `PermissionGate` on each nav section |
| 1.4 | Rotate default admin / prod seed | VPS + `DatabaseSeeder` | Change password; disable weak default in production |
| 1.5 | HTTPS for production mobile | VPS + `mobile app/lib/core/app_config.dart` | Domain + SSL; rebuild APK with `https://` |
| 1.6 | Push deploy fixes to Git | Repo | Permission fix, Docker deploy, mobile nav, seed script |

**Checklist**

- [ ] 1.1 Role-based login redirect (web)
- [ ] 1.2 Web auth route guard
- [ ] 1.3 Web sidebar by role/permission
- [ ] 1.4 Rotate admin password / prod seed
- [ ] 1.5 HTTPS + mobile API URL
- [ ] 1.6 Git push deploy + API fixes

---

## Phase 2 — Member mobile (core gaps)

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 2.1 | Assigned workout plans only | `MeController` + mobile | Filter plans by `UserSchedules` for current user |
| 2.2 | Diet plans on mobile | API + mobile UI | `GET /api/me/diet-plan` + new tab or section |
| 2.3 | Member test account workflow | Web + doc | Admin creates Member → assign plans → test on phone |
| 2.4 | Empty states | Mobile screens | “No workout assigned — contact your gym” |
| 2.5 | QR scan error messages | `qr_scanner_screen.dart` | Map rate limit, replay, location, expired membership |
| 2.6 | Token refresh on VPS | `api_client.dart` | Verify 401 → refresh works against production |

**Checklist**

- [ ] 2.1 Mobile: assigned workouts only
- [ ] 2.2 Mobile: diet plans
- [ ] 2.3 Member test account E2E doc
- [ ] 2.4 Mobile empty states
- [ ] 2.5 Mobile QR error messages
- [ ] 2.6 Mobile token refresh verify

---

## Phase 3 — Web admin/staff (UX & permissions)

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 3.1 | PermissionGate on all nav groups | `SidebarNav.tsx` | Reports, Users, Training, Payments, Access |
| 3.2 | Friendly 403 on web | `gym_client/src/lib/api.ts` | User-facing “no access” message |
| 3.3 | User detail onboarding checklist | `UserDetailPage.tsx` | Steps: Profile → Membership → Workout → Diet |
| 3.4 | Trainer limited menu | Sidebar + routes | Hide analytics, roles, gym ops if no permission |
| 3.5 | Staff front-desk menu | Sidebar | Attendance, scan, users, memberships |

**Checklist**

- [ ] 3.1 PermissionGate all nav sections
- [ ] 3.2 Web friendly 403 handling
- [ ] 3.3 User detail onboarding checklist UI
- [ ] 3.4 Trainer limited menu
- [ ] 3.5 Staff front-desk menu

---

## Phase 4 — API & data consistency

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 4.1 | Member diet endpoints | `MeController.cs` | Read-only diet + meals for assigned plan |
| 4.2 | Member log body metrics | `MeController.cs` | `POST /api/me/body-metrics` |
| 4.3 | Workout plans pagination | `MeController.cs` | Paginate or cap results |
| 4.4 | Exercise API DB name | `deploy/.env` | `DB_NAME=GymManagementDb` |
| 4.5 | Notifications mark read | API + mobile | `PATCH` + UI |
| 4.6 | Membership expiry on scan | Attendance orchestrator | Block or warn when expired |

**Checklist**

- [ ] 4.1 API GET /api/me/diet-plan
- [ ] 4.2 API POST /api/me/body-metrics
- [ ] 4.3 API workout plans pagination
- [ ] 4.4 Exercise API DB alignment
- [ ] 4.5 Notifications mark read
- [ ] 4.6 Membership expiry on scan

---

## Phase 5 — Auth & account management

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 5.1 | Forgot password (web) | `AuthController` + UI | Reset token + email/webhook |
| 5.2 | Forgot password (mobile) | `login_screen.dart` | Same flow as web |
| 5.3 | Change password | Profile web + mobile | `POST /api/Auth/change-password` |
| 5.4 | Member self-registration | Web (optional) | Pending → admin approves |
| 5.5 | Logout all devices | `SecurityPage` | Verify + mobile logout |

**Checklist**

- [ ] 5.1 Forgot password web
- [ ] 5.2 Forgot password mobile
- [ ] 5.3 Change password profile
- [ ] 5.4 Member self-registration (optional)
- [ ] 5.5 Logout all devices verify

---

## Phase 6 — Mobile UX & features

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 6.1 | Safe area + floating bottom nav | `app_shell`, `premium_bottom_nav` | **Done** — verify on devices |
| 6.2 | Pull-to-refresh all tabs | Tab screens | Align Home, Workouts, Progress, etc. |
| 6.3 | Profile edit | Mobile profile | Name, phone, photo if API supports |
| 6.4 | Workout history | API + Progress tab | `GET /api/me/workout-sessions` |
| 6.5 | Body metrics charts | Progress tab | `fl_chart` trends |
| 6.6 | Post-QR success UX | Scanner → Home | Success banner |
| 6.7 | Offline workout sync | Mobile | Queue sets → sync (later) |
| 6.8 | App package name + icon | `android/app/build.gradle.kts` | Not `com.example.*` |
| 6.9 | Android release keystore | Android signing | Play Store / distribution |

**Checklist**

- [x] 6.1 Safe area + floating bottom nav
- [ ] 6.2 Pull-to-refresh all tabs
- [ ] 6.3 Mobile profile edit
- [ ] 6.4 Workout history API + UI
- [ ] 6.5 Body metrics charts
- [ ] 6.6 Post-QR success UX
- [ ] 6.7 Offline workout sync (later)
- [ ] 6.8 App package name + icon
- [ ] 6.9 Android release keystore

---

## Phase 7 — Web features (polish)

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 7.1 | Minimal member web portal | New routes | Read-only schedule, diet, attendance |
| 7.2 | Help link in mobile | Profile | Open `/help` in browser |
| 7.3 | Bulk import members | Users page | CSV import |
| 7.4 | Export member report | User detail | PDF/CSV |
| 7.5 | Bulk workout assignment | Assignments page | Many users at once |
| 7.6 | Diet reminder notifications | Notifications config | Email/WhatsApp webhooks |

**Checklist**

- [ ] 7.1 Minimal member web portal
- [ ] 7.2 Help link in mobile
- [ ] 7.3 Bulk member import
- [ ] 7.4 Export member report
- [ ] 7.5 Bulk workout assignment
- [ ] 7.6 Diet reminder notifications

---

## Phase 8 — Infrastructure & ops (VPS)

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 8.1 | Docker deploy (testing) | `deploy/` | **Done** |
| 8.2 | Database seed script | `deploy/scripts/seed.sh` | **Done** |
| 8.3 | Automated backups | VPS crontab | `deploy/scripts/backup.sh` daily |
| 8.4 | Monitoring | VPS | Health, disk, RAM alerts |
| 8.5 | Disable auto-seed in prod | `deploy/.env` | `DATABASE_SEED_DEFAULTS=false` |
| 8.6 | Swagger blocked in prod | Nginx | Keep `/swagger` → 404 |
| 8.7 | Domain + SSL production | `deploy/DEPLOYMENT.md` | When going live |
| 8.8 | CI pipeline | GitHub Actions | Build web + APK on push |

**Checklist**

- [x] 8.1 Docker deploy testing mode
- [x] 8.2 Database seed script
- [ ] 8.3 VPS backup cron
- [ ] 8.4 VPS monitoring
- [ ] 8.5 Disable auto-seed in prod
- [ ] 8.6 Swagger off in prod (verify)
- [ ] 8.7 Domain SSL production
- [ ] 8.8 CI pipeline

---

## Phase 9 — Training / AI (staff-only)

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 9.1 | Document exercise API | README / this doc | Web studio needs `exercise-api` + keys |
| 9.2 | Verify exercise-api proxy | Nginx / VPS | `/exercise-api/` from web |
| 9.3 | Fallback when API down | Web workout modules | Graceful error UI |
| 9.4 | Merge exercise API into .NET | Architecture | Optional long-term |

**Checklist**

- [ ] 9.1 Document exercise API
- [ ] 9.2 Verify exercise-api proxy
- [ ] 9.3 Exercise API fallback UI
- [ ] 9.4 Merge exercise API (optional)

---

## Phase 10 — Notifications & engagement

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 10.1 | Firebase FCM | Mobile + API | Device tokens, push send |
| 10.2 | Membership expiry reminders | Hosted service | Config in `appsettings` |
| 10.3 | Workout day reminders | Scheduled job | “Chest day today” |
| 10.4 | In-app notification center | Mobile Home | Tap → detail |

**Checklist**

- [ ] 10.1 Push notifications FCM
- [ ] 10.2 Membership expiry reminders
- [ ] 10.3 Workout day reminders
- [ ] 10.4 Notification center mobile

---

## Phase 11 — Payments & business

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 11.1 | Payment gateway | Payments module | Stripe / Razorpay / etc. |
| 11.2 | Member invoices (mobile) | Membership tab | `GET /api/me/invoices` |
| 11.3 | Renew membership in app | Mobile + API | After gateway |

**Checklist**

- [ ] 11.1 Payment gateway
- [ ] 11.2 Member invoices mobile
- [ ] 11.3 Renew membership in app

---

## Phase 12 — Quality & testing

| ID | Task | Where | What to do |
|----|------|--------|------------|
| 12.1 | E2E smoke (web) | `gym_client/playwright` | Against staging VPS |
| 12.2 | API integration tests | .NET test project | Auth, me, attendance |
| 12.3 | Flutter widget tests | `mobile app` | Login, home |
| 12.4 | Test matrix doc | Docs | Per role flows |
| 12.5 | VPS load test | k6 / manual | 2GB RAM limits |

**Checklist**

- [ ] 12.1 Playwright E2E
- [ ] 12.2 API integration tests
- [ ] 12.3 Flutter tests
- [ ] 12.4 Test matrix doc
- [ ] 12.5 VPS load test

---

## Full checklist (copy-paste)

```
PHASE 1 — CRITICAL
[ ] 1.1  Web role-based login redirect
[ ] 1.2  Web auth route guard
[ ] 1.3  Web sidebar by role/permission
[ ] 1.4  Rotate admin password / prod seed
[ ] 1.5  HTTPS + mobile API URL
[ ] 1.6  Git push deploy + API fixes

PHASE 2 — MEMBER MOBILE
[ ] 2.1  Mobile: assigned workouts only
[ ] 2.2  Mobile: diet plans
[ ] 2.3  Member test account E2E doc
[ ] 2.4  Mobile empty states
[ ] 2.5  Mobile QR error messages
[ ] 2.6  Mobile token refresh verify

PHASE 3 — WEB ADMIN/STAFF
[ ] 3.1  PermissionGate all nav sections
[ ] 3.2  Web friendly 403 handling
[ ] 3.3  User detail onboarding checklist UI
[ ] 3.4  Trainer limited menu
[ ] 3.5  Staff front-desk menu

PHASE 4 — API & DATA
[ ] 4.1  API GET /api/me/diet-plan
[ ] 4.2  API POST /api/me/body-metrics
[ ] 4.3  API workout plans pagination
[ ] 4.4  Exercise API DB alignment
[ ] 4.5  Notifications mark read
[ ] 4.6  Membership expiry on scan

PHASE 5 — AUTH
[ ] 5.1  Forgot password web
[ ] 5.2  Forgot password mobile
[ ] 5.3  Change password profile
[ ] 5.4  Member self-registration (optional)
[ ] 5.5  Logout all devices verify

PHASE 6 — MOBILE UX
[x] 6.1  Safe area + floating bottom nav
[ ] 6.2  Pull-to-refresh all tabs
[ ] 6.3  Mobile profile edit
[ ] 6.4  Workout history API + UI
[ ] 6.5  Body metrics charts
[ ] 6.6  Post-QR success UX
[ ] 6.7  Offline workout sync (later)
[ ] 6.8  App package name + icon
[ ] 6.9  Android release keystore

PHASE 7 — WEB POLISH
[ ] 7.1  Minimal member web portal
[ ] 7.2  Help link in mobile
[ ] 7.3  Bulk member import
[ ] 7.4  Export member report
[ ] 7.5  Bulk workout assignment
[ ] 7.6  Diet reminder notifications

PHASE 8 — INFRASTRUCTURE
[x] 8.1  Docker deploy testing mode
[x] 8.2  Database seed script
[ ] 8.3  VPS backup cron
[ ] 8.4  VPS monitoring
[ ] 8.5  Disable auto-seed in prod
[ ] 8.6  Swagger off in prod (verify)
[ ] 8.7  Domain SSL production
[ ] 8.8  CI pipeline

PHASE 9 — TRAINING / AI
[ ] 9.1  Document exercise API
[ ] 9.2  Verify exercise-api proxy
[ ] 9.3  Exercise API fallback UI
[ ] 9.4  Merge exercise API (optional)

PHASE 10 — NOTIFICATIONS
[ ] 10.1 Push notifications FCM
[ ] 10.2 Membership expiry reminders
[ ] 10.3 Workout day reminders
[ ] 10.4 Notification center mobile

PHASE 11 — PAYMENTS
[ ] 11.1 Payment gateway
[ ] 11.2 Member invoices mobile
[ ] 11.3 Renew membership in app

PHASE 12 — TESTING
[ ] 12.1 Playwright E2E
[ ] 12.2 API integration tests
[ ] 12.3 Flutter tests
[ ] 12.4 Test matrix doc
[ ] 12.5 VPS load test
```

---

## Notes

- When starting an item, add your name/date in a commit or project board.
- For implementation help in Cursor, reference the item ID (e.g. **“implement 2.1”**).
- Completed VPS work: deploy pack in `deploy/`, permission fix in `HasPermissionAttribute`, mobile nav in `features/shell/`.
