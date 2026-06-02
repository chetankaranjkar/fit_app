# Performance implementation — short summary

**Full details:** [PERFORMANCE_IMPLEMENTATION.md](./PERFORMANCE_IMPLEMENTATION.md)  
**Audit / findings:** [PERFORMANCE_AUDIT_REPORT.md](./PERFORMANCE_AUDIT_REPORT.md)

## What we did

- **Backend:** Paged APIs (attendance, payments, invoices, trainers, diet plans, users, memberships), `GET /api/Dashboard/summary`, dashboard SQL aggregates, compression, rate limiting, permission cache, slow-request logging, `AuditLog` entity + index migration file.
- **Frontend:** `ListPagination`, server paging on Members/Users/Attendance/Payments/Trainers/Diet, client paging on smaller lists, virtualized members table, React Query 5m stale / 10m GC, admin + owner analytics use dashboard summary instead of `getAll()`.

## Migrate

```bash
# Local
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API

# UAT / prod (on VPS after git pull)
./deploy/scripts/update-uat.sh   # or update.sh for production
# Migrations also run on API start when DATABASE_AUTO_MIGRATE=true
```

**Note:** Performance index migration `20260602130000_AddPerformanceIndexesAndAuditLogs` needs EF snapshot registration before it runs on servers. See full doc.

## Paged API shape

```json
{ "data": [], "page": 1, "pageSize": 25, "totalRecords": 1000, "totalPages": 40 }
```
