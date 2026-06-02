# Gym Management — Performance Audit Report

**Date:** 2026-06-02  
**Scope:** .NET 9 API (`src/`), React client (`gym_client/`), SQL Server  
**Method:** Static code review, query-path analysis, frontend data-fetch patterns

---

## Executive summary

The application has solid foundations (EF global soft-delete filters, some paged APIs, route-level code splitting, TanStack Query defaults). The largest bottlenecks are **dashboard fan-out** (multiple full-table API calls), **list endpoints without server pagination** (attendance, payments, invoices, trainers), **DashboardService loading all trainers/schedules into memory**, and **missing composite indexes** on high-volume filters. This pass implements safe, incremental fixes without changing business rules.

**Deferred (documented, not breaking schema):** Migrating `IsDeleted` → `deleted_at` on all entities (equivalent filtered indexes on `IsDeleted` are applied instead). Full `branch_id` on every entity. Image thumbnail pipeline. Full Redis deployment.

---

## 1. Slow database queries

| Area | Finding | Severity |
|------|---------|----------|
| `DashboardService.GetStatisticsAsync` | Loads **all** trainers, auth users, schedules; loops in memory | High |
| `TrainerService.GetAllTrainersAsync` | Loads all trainers + auth users | High |
| `AttendanceLogService.GetAll*` | Full table scan + in-memory sort | High |
| `PaymentService.GetAllAsync` | Full payments + invoice map | High |
| `InvoiceService.GetAllAsync` | `Include` chains on full invoice set | High |
| `ExerciseService.GetAllExercisesAsync` | N+1 exercise steps per exercise (legacy path) | Medium |
| `UserService.GetAllUsersAsync` | Still used by some dashboards | High |

**Mitigation (this pass):** Aggregated `GET /api/Dashboard/summary`; paged endpoints for attendance/payments/invoices/trainers; SQL aggregates in dashboard statistics refactor.

---

## 2. Missing indexes

| Requested | Schema reality | Action |
|-----------|----------------|--------|
| Users email | On `AuthUsers.Email` (unique, filtered) | Exists |
| Users mobile | `Users.Phone` unique filtered | Exists |
| Users active | No dedicated index | **Add** `IX_Users_IsActive` filtered |
| Member member_code | **No column** on `Member` | Document; use `UserId` unique index (exists) |
| Member branch_id | **No column** on `Member` | Document; `OrganizationId` on `User` |
| Trainer user_id | Unique index | Exists |
| Trainer specialization | No index | **Add** |
| Attendance member+date | `UserId` + `AttendanceDate` composite | Exists |
| Attendance date-only | No single-column index | **Add** `AttendanceDate` |
| Attendance unique/day | Not enforced | **Add** unique filtered `(UserId, AttendanceDate)` |
| Payment member_id | `MembershipId` FK | **Add** explicit index |
| Payment date / status | `PaymentDate` unindexed; no Payment status column | **Add** `PaymentDate` index |
| Membership member/expiry | Partial coverage | **Add** `UserId`, `EndDate`, `Status` |

---

## 3. N+1 query problems

| Location | Pattern |
|----------|---------|
| `ExerciseService.GetAllExercisesAsync` | Per-exercise `ExerciseSteps` query |
| `TrainerService.GetTrainerByIdAsync` | `AuthUsers.GetAllAsync()` for one email |
| Legacy `UnitOfWork` repositories | Some `GetAllAsync` without projection |

**Mitigation:** Prefer `AsNoTracking()` + `Include` or split queries; paged APIs avoid loading full graphs.

---

## 4–5. Unnecessary / duplicate API calls

| Client location | Issue |
|-----------------|-------|
| `useAdminKpis` | `usersService.getAll()`, `userMembershipsService.getAll()`, `paymentsService.getAll()` in parallel |
| `OwnerAnalyticsPage` | `usersService.getAll()` for KPIs |
| `TrainerDashboardPage` | `usersService.getAll()`, `userSchedulesService.getAll()` |
| `PaymentsPage` | Multiple full lists on mount |
| `AttendancePage` | Full attendance + full users |

**Mitigation:** `GET /api/Dashboard/summary`; React Query `staleTime`/`gcTime`; query key deduplication.

---

## 6. Large payload responses

Unpaginated `GET` list endpoints return full DTO graphs (invoices with items, memberships with nested data). **Mitigation:** Server-side pagination + list DTOs without deep includes where added.

---

## 7. Missing pagination

| Module | Status before pass |
|--------|-------------------|
| Users | Server paged |
| User memberships | Server paged |
| Exercises | Server paged |
| Diet plans | Server paged (recent) |
| Attendance | **None** → added |
| Payments | **None** → added |
| Invoices | **None** → added |
| Trainers | **None** → added |
| Programs, coupons, etc. | Client paging (partial) |

---

## 8–9. React re-renders & unoptimized lists

- Large tables render all rows (Users, Attendance, Payments).
- **Mitigation:** `@tanstack/react-virtual` on Users table; `React.memo` on virtual row component; debounced search (300ms) on key pages.

---

## 10. Unused components

Not exhaustively removed in this pass (risk of breaking dynamic imports). Recommend periodic `knip` / bundle analyzer run.

---

## 11. Memory leaks

- No widespread missing cleanup found; `ScrollTrigger.getAll().forEach(kill)` in `gsapSetup.ts` is correct.
- React Query cache bounded by `gcTime`.

---

## 12. Slow dashboard loading

**Root cause:** 4–6 parallel calls, three of which download entire tables.  
**Target:** Single `GET /api/Dashboard/summary` &lt; 500ms with indexed aggregates.

---

## 13. Expensive client calculations

`useAdminKpis` filters/sorts full user/membership/payment arrays in browser. Replaced by server aggregates for headline KPIs.

---

## 14. Missing caching

- No API response cache layer (Redis optional in config).
- Permission middleware hits DB every request.
- **Mitigation:** `IAppCache` (memory); permission cache per user (5 min); React Query 5m/10m.

---

## 15–16. Lazy loading & bundle

- Routes already use `React.lazy` in `routes/index.tsx`.
- Heavy deps: `three`, `gsap`, `firebase` — keep route-scoped.
- **Recommendation:** Vite `manualChunks` for vendor splits (future).

---

## Soft delete (`deleted_at` vs `IsDeleted`)

The domain uses **`BaseEntity.IsDeleted`** with global query filters. Introducing `deleted_at` on all tables would require EF model, API, and client changes across 40+ entities. **This pass adds filtered indexes on `IsDeleted = 0`** (SQL Server equivalent). A phased `deleted_at` migration can align naming later without behavior change.

---

## Multi-branch readiness

`Branch`, `OrganizationId` exist on several entities. `Member` has no `branch_id` yet. New nullable `BranchId` columns are **not** added in this pass to avoid migration risk; summary APIs are branch-agnostic until branch scoping is a product requirement.

---

## Estimated improvement (after this pass)

| Metric | Before (est.) | After (est.) |
|--------|---------------|--------------|
| Admin dashboard initial load | 3–8s (large data) | &lt; 2s |
| Member search (paged) | 1–3s | &lt; 500ms |
| Attendance / payments list | 2–10s | &lt; 1s (page 1) |
| API DB round-trips (dashboard) | 3 full scans + extras | 1 summary query |

---

## Future recommendations

1. Server paged **workout plans** and **programs** APIs.
2. Redis-backed `IAppCache` when `Redis:ConnectionString` is set.
3. Member list thumbnails (`ProfilePictureThumbnailUrl`) + lazy `loading="lazy"`.
4. `EXPLAIN` playbook in CI for top 10 repository methods.
5. OpenTelemetry / Application Insights for request and dependency timing.
6. EF compiled queries for hot paths.
7. Read replica for reporting endpoints.
