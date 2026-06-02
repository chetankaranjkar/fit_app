# Performance implementation — what we shipped

**Date:** June 2026  
**Commit:** `557dfc0` (and related work on `uat` / `main`)  
**Related:** [PERFORMANCE_AUDIT_REPORT.md](./PERFORMANCE_AUDIT_REPORT.md) (findings), [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) (deploy)

This document describes the performance work actually implemented in the gym management app (.NET 9 API + React client + SQL Server).

---

## Goals

1. Stop loading entire tables on list screens and dashboards.
2. Add server-side pagination and search where lists are large.
3. Reduce dashboard API fan-out and database full scans.
4. Improve repeat-request cost (caching, compression, query defaults).
5. Prepare indexes and audit infrastructure without breaking existing soft-delete behavior.

---

## Backend (API)

### Paged list APIs

New or extended `GET .../paged` endpoints return a standard envelope:

```json
{
  "data": [],
  "page": 1,
  "pageSize": 25,
  "totalRecords": 1000,
  "totalPages": 40
}
```

| Endpoint | Service | Query params (typical) |
|----------|---------|-------------------------|
| `GET /api/AttendanceLogs/paged` | `AttendanceLogService` | `page`, `pageSize`, `search`, `fromDate`, `toDate`, `sortBy`, `sortDir` |
| `GET /api/Payments/paged` | `PaymentService` | `page`, `pageSize`, `search`, `fromDate`, `toDate`, `sortBy`, `sortDir` |
| `GET /api/Invoices/paged` | `InvoiceService` | Same pattern (list without heavy line-item graphs) |
| `GET /api/Trainers/paged` | `TrainerService` | `page`, `pageSize`, `search`, `sortBy`, `sortDir` |
| `GET /api/DietPlans/paged` | `DietPlanService` | `page`, `pageSize`, `search`, `goalType`, `isActive` |
| `GET /api/DietPlans/stats` | `DietPlanService` | Aggregated diet plan KPIs |
| `GET /api/Users/paged` | `UserService` | `page`, `pageSize`, `search`, `membersOnly`, `isActive` |
| `GET /api/UserMemberships/paged` | `UserMembershipService` | `page`, `pageSize`, `search`, `status` |
| `GET /api/Exercises/paged` | `ExerciseService` | Existing paged exercises API (client fallback updated) |

Legacy `GET` list routes remain for backward compatibility.

**Shared types:** `PagedQueryDto`, `PagedResultDto`, `ApiPagedResponse<T>` in `GymManagement.Core/DTOs/Common/PagedQueryDto.cs`  
**Helper:** `PagedQueryHelper.cs` in Infrastructure for consistent skip/take and sorting.

### Dashboard summary

| Endpoint | Purpose |
|----------|---------|
| `GET /api/Dashboard/summary` | Single aggregated KPI payload (`DashboardSummaryDto`) |

**Fields include:** `totalMembers`, `activeMembers`, `expiredMemberships`, `todayAttendance`, `pendingPayments`, `monthlyRevenue`, `todayRevenue`, `trainerCount`, `newMembersToday`, `expiringMembershipsNext14Days`.

**Caching:** Summary is cached ~2 minutes via `IAppCache` / `MemoryAppCache`.

**Refactor:** `DashboardService.GetStatisticsAsync` uses SQL aggregates instead of loading all trainers and schedules into memory.

### Cross-cutting API improvements

| Change | Location | Behavior |
|--------|----------|----------|
| Response compression | `Program.cs` | Brotli/Gzip for JSON responses |
| Global rate limiting | `Program.cs` | 300 requests / minute / IP |
| Permission cache | `PermissionResolutionMiddleware` | RBAC resolution cached 5 min per user (`IMemoryCache`) |
| Slow request logging | `RequestTimingMiddleware` | Logs requests ≥ 500 ms (configurable via `Performance:SlowRequestThresholdMs`) |
| In-memory app cache | `MemoryAppCache`, `IAppCache` | Used by dashboard summary (Redis-ready interface for later) |

### Database

**Entity:** `AuditLog` (`GymManagement.Domain/Entities/AuditLog.cs`) — table for future structured audit writes.

**Migration file:** `20260602130000_AddPerformanceIndexesAndAuditLogs.cs`

Planned indexes (when migration is registered in EF chain):

| Table | Index |
|-------|--------|
| `Users` | `IsActive` (filtered), `RegistrationDate` |
| `Members` | `IsActive` (filtered) |
| `Trainer` | `Specialization` (filtered) |
| `AttendanceLogs` | `AttendanceDate`, unique `(UserId, AttendanceDate)` |
| `payments` | `MembershipId`, `PaymentDate` |
| `user_memberships` | `UserId`, `EndDate`, `Status` |
| `AuditLogs` | `CreatedAt`, `(Entity, CreatedAt)`, `UserId` |

**Soft delete:** Unchanged — `BaseEntity.IsDeleted` + global query filters. Filtered indexes use `[IsDeleted] = 0`. No `deleted_at` column added.

**Migration status:** The performance migration file exists in the repo but was **not** added to the EF designer snapshot at ship time. Registered migrations through `20260601120000_EnterpriseBillingPaymentsWaiveOff` apply on deploy via `DATABASE_AUTO_MIGRATE`. To apply performance indexes, run `dotnet ef migrations add` to reconcile the snapshot, then deploy.

**Apply locally:**

```bash
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API
```

**UAT / production:** Migrations run on API start when `DATABASE_AUTO_MIGRATE=true`, or restart API via `./deploy/scripts/migrate.sh` after `git pull`.

---

## Frontend (React)

### Global React Query defaults

**File:** `gym_client/src/lib/queryClient.ts`

| Option | Value |
|--------|--------|
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `refetchOnWindowFocus` | `false` |
| `retry` | `1` |

### Shared UI

| File | Purpose |
|------|---------|
| `components/ui/ListPagination.tsx` | Reusable page / page-size footer for tables |
| `hooks/useClientPagination.ts` | Client-side slice helper for smaller lists |
| `types/apiPaged.ts` | `ApiPagedResponse<T>` TypeScript type |
| `components/ui/VirtualTableBody.tsx` | Virtualized table body helper |
| `components/ui/VirtualizedTbody.tsx` | Alternate virtual tbody experiment |

**Dependency:** `@tanstack/react-virtual` in `package.json`.

### Pages wired to server pagination

| Page | API | Notes |
|------|-----|--------|
| **Users / Members** (`UsersPage.tsx`) | `usersService.getPaged` | Server search (debounced), status filter, `ListPagination`, **virtualized rows** on desktop |
| **Attendance** (`AttendancePage.tsx`) | `attendanceService.getPaged` | Date range + search; stats from capped page (500); member picker `usersService.getPaged`; `ListPagination` |
| **Payments** (`PaymentsPage.tsx`) | `paymentsService.getPaged` | Filtered by report date range; membership picker `userMembershipsService.getPaged`; `ListPagination` |
| **Trainers** (`TrainersPage.tsx`) | `trainersService.getPaged` | 300 ms debounced search |
| **Diet plans** (`DietPlansPage.tsx`, dashboard, assign) | `dietPlansService.getPaged` / `stats` | Server paging and stats |
| **Exercise management** | `/Exercises/paged` fallback in `api.ts` | Avoids loading all exercises |
| **Membership plans** (`MembershipPlansPage.tsx`) | Client pagination | `useClientPagination` + `ListPagination` |
| **Coupons** (`CouponsPage.tsx`) | Client pagination | Same pattern |
| **Programs / body parts** | Client pagination | Same pattern |
| **Assign diet** (`AssignDietPlansPage.tsx`) | Paged diet plans | Reduced payload |

### Dashboards and analytics

| Location | Before | After |
|----------|--------|--------|
| `useAdminKpis.ts` | `getAll()` users, memberships, payments | `dashboardService.getSummary()` + small paged slices |
| `OwnerAnalyticsPage.tsx` | `usersService.getAll()` for member KPIs | `dashboardService.getSummary()` |

### Service layer additions

| Service | New methods |
|---------|-------------|
| `dashboard.service.ts` | `getSummary()` |
| `attendance.service.ts` | `getPaged()` |
| `payments.service.ts` | `getPaged()` |
| `trainers.service.ts` | `getPaged()` |
| `dietPlans.service.ts` | `getPaged()`, stats |
| `users.service.ts` | `getPaged()` (already existed; used more widely) |
| `userMemberships.service.ts` | `getPaged()` (already existed; used in pickers) |

---

## Expected impact (approximate)

| Scenario | Before | After |
|----------|--------|--------|
| Admin dashboard JSON | Multiple full-table responses | One summary + small pages |
| Trainer list (500+ rows) | Load all | 25–50 per request |
| Members table DOM | All rows rendered | Virtualized visible rows |
| Permission DB lookups | Every authenticated request | Cached 5 min per user |
| Repeat dashboard visits | Full refetch on focus | 5 min stale, no focus refetch |

---

## Deploy checklist

1. `git pull` on UAT (`uat`) then production (`main`).
2. `./deploy/scripts/update-uat.sh` or `./deploy/scripts/update.sh`.
3. Confirm API healthy and migrations applied:
   ```bash
   docker logs gym-uat-api --tail 80    # UAT
   docker logs gym-api --tail 80        # Production
   ```
4. Smoke-test: Members list, Attendance, Payments, Admin dashboard, Owner analytics.

---

## Not done / follow-up

1. Register `20260602130000_AddPerformanceIndexesAndAuditLogs` in EF snapshot and deploy indexes.
2. Wire `Invoices` list page to `GET /api/Invoices/paged` (API exists; client list page may still use legacy route).
3. Server-side status filters on Attendance (checked-in / late) — currently filtered on current page only.
4. Redis-backed `IAppCache` when `Redis:ConnectionString` is configured.
5. Write domain events into `AuditLogs` table.
6. Payment KPI “total collected” uses capped stats slice (500 rows) when range is large — consider report API aggregate.
7. Remove or consolidate unused `VirtualizedTbody.tsx` if `UsersPage` virtual row pattern is final.
8. Trainer dashboard / other pages still calling `getAll()` where not listed above — audit as needed.

---

## Key file paths (quick reference)

```
docs/PERFORMANCE_AUDIT_REPORT.md
docs/PERFORMANCE_IMPLEMENTATION.md          ← this file
src/GymManagement.API/Program.cs
src/GymManagement.API/Middleware/RequestTimingMiddleware.cs
src/GymManagement.API/Middleware/PermissionResolutionMiddleware.cs
src/GymManagement.Infrastructure/Services/DashboardService.cs
src/GymManagement.Infrastructure/Migrations/20260602130000_AddPerformanceIndexesAndAuditLogs.cs
gym_client/src/lib/queryClient.ts
gym_client/src/components/ui/ListPagination.tsx
gym_client/src/pages/UsersPage.tsx
gym_client/src/pages/AttendancePage.tsx
gym_client/src/pages/PaymentsPage.tsx
gym_client/src/pages/dashboards/useAdminKpis.ts
```
