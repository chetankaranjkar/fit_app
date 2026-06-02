# UI data grid & layout audit (2026-06)

Enterprise SaaS-style list UX: fixed shell, scrollable grids only, shared `EnterpriseDataGrid`.

## 1. UI audit summary

| Area | Before | After |
|------|--------|-------|
| Page scroll | Locomotive Scroll + `overflow-y-auto` on main content scrolled entire pages | `html/body.dashboard-app { overflow: hidden }`; main is `overflow-hidden` |
| Table scroll | `overflow-x-auto` on page sections; pagination below fold | Grid body scrolls inside panel; sticky header + sticky pagination footer |
| Row actions | 4–5 text links per row (120px+) | `RowActionsMenu` (⋮) ~72px |
| Badges | Mixed sizes (`text-xs`, multi-line stacks) | `StatusBadge` compact pills (`text-[10px]`, single line) |
| Row height | ~64–72px with large padding | 52px target (`h-[52px]`) |
| Column widths | `min-w-*` on table, overlap on resize | `table-layout: fixed` + per-column `minWidth` / drag resize |
| Virtualization | Custom absolute `<tr>` (invalid HTML) | `@tanstack/react-virtual` padding rows inside grid |
| Consistency | Per-page search inputs and tables | `DataToolbar`, `DashboardTablePanel`, `EnterpriseDataGrid` |

## 2. Pages reviewed

| Page | Route | Grid migrated | Notes |
|------|-------|---------------|-------|
| Members | `/dashboard/users` | Yes | Virtualized grid for 40+ rows; mobile cards unchanged |
| Trainers (Staff) | `/dashboard/trainers` | Yes | Reference implementation |
| Attendance | `/dashboard/attendance` | Yes | Grid + exceptions sidebar; only grid scrolls |
| Payments | `/dashboard/payments` | Yes | Invoice actions in cells; ⋮ for edit/delete |
| Memberships | `/dashboard/user-memberships` | Yes | `MembershipStatusBadge` + row menu |
| Membership plans | `/dashboard/membership-plans` | Yes | Client-paged catalog |
| PT Sessions | `/dashboard/.../pt-sessions` | Yes | Date filters + pagination |
| Products | `/dashboard/.../products` | Yes | Category / low-stock filters in toolbar |
| Expenses | `/dashboard/gym-operations/expenses` | Yes | Form column + grid column layout |
| Users | Same as Members | Yes | — |
| Staff | Trainers page | Yes | — |

### Also using shared shell (tables not yet migrated)

`MembershipPlansPage`, `CouponsPage`, `ExercisesPage`, `ProgramsPage`, `SecurityPage`, `RolesPage`, retail POS orders, locker logs — inherit `DashboardSubpageShell` flex layout; replace `<table>` with `EnterpriseDataGrid` incrementally.

## 3. Components refactored / added

| Component | Path |
|-----------|------|
| `EnterpriseDataGrid` | `gym_client/src/components/data-grid/EnterpriseDataGrid.tsx` |
| `DataToolbar`, `DataFilterSelect` | `gym_client/src/components/data-grid/DataToolbar.tsx` |
| `StatusBadge` | `gym_client/src/components/data-grid/StatusBadge.tsx` |
| `MembershipStatusBadge` | `gym_client/src/components/billing/MembershipStatusBadge.tsx` |
| `RowActionsMenu` | `gym_client/src/components/data-grid/RowActionsMenu.tsx` |
| `DataPageShell`, `DataPageSection`, `DataPageBody` | `gym_client/src/components/layout/DataPageShell.tsx` |
| `DashboardLayout` | Removed Locomotive Scroll; fixed viewport shell |
| `DashboardSubpageShell` / `DashboardTablePanel` | Flex `min-h-0` + `overflow-hidden` for grid fill |
| `ListPagination` | Used as sticky grid footer via grid wrapper |

Dependency added: `@tanstack/react-table` (column state, sort, filter).

## 4. EnterpriseDataGrid API (quick reference)

```tsx
<EnterpriseDataGrid
  data={rows}
  columns={columnDefs}
  getRowId={(row) => row.id}
  virtualize={rows.length > 40}
  pagination={{ page, pageSize, totalCount, onPageChange, onPageSizeChange }}
/>
```

Column def highlights:

- `sticky: true` — first column pinned on horizontal scroll  
- `minWidth` / `width` — fixed layout widths (e.g. Member 250px, Phone 140px, Actions 72px)  
- `sortable: true` — client-side sort  
- `filterable: true` — header filter row  
- `hideBelow: 'lg' | 'xl'` — responsive hide + horizontal scroll  

## 5. Layout fixes applied

```
┌─────────────────────────────────────────┐
│ TopNavbar (fixed height)                │
├──────────┬──────────────────────────────┤
│ Sidebar  │ DataPageShell (no scroll)    │
│ (fixed)  │  ├─ KPI / title (shrink-0)   │
│          │  └─ DashboardTablePanel      │
│          │       ├─ toolbar (shrink-0)  │
│          │       ├─ grid (overflow auto)│
│          │       └─ pagination (sticky) │
└──────────┴──────────────────────────────┘
```

## 6. UX improvements summary

- **20k+ members**: server paging unchanged; client virtualizes current page when &gt; 40 rows.  
- **Dark theme**: grid header/footer `rgba(12,10,28,0.98)` for readable sticky layers.  
- **8px rhythm**: `gap-2` toolbars, `px-3` cells, `py-2` controls.  
- **No overlap**: `truncate` on cells, fixed action column, compact badges.  
- **CRM parity**: sort, filter, resize, sticky first column, horizontal scroll on tablet.

## 7. How to migrate another list page

1. Wrap page content in `DashboardSubpageShell` (already flex-safe).  
2. Put KPIs in `DataPageSection`.  
3. Use `DashboardTablePanel` with `DataToolbar` in `toolbar`.  
4. Replace `<table>` with `EnterpriseDataGrid`.  
5. Move row actions to `RowActionsMenu`.  
6. Use `StatusBadge` for status columns.
