# Reuse & conventions (anti-duplication)

Companion to [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md). Check this **before** implementing UI or API features.

---

## Golden rules

1. **One provisioning path** for users, roles, and profiles → `UserProvisioningService`.
2. **One assignment path** for member ↔ coach → `UserInstructorService`.
3. **One photo upload UX** → `ProfilePhotoEditor` + `fileUploadService.uploadUserProfileImage`.
4. **Identity on `Users` only** — no `TrainerName` / `MemberName` columns.
5. **Prefer extending** existing service + React Query keys over new parallel state (e.g. avoid new Zustand mock stores for production paths).

---

## Frontend patterns

### Data fetching

- Use **TanStack Query** with consistent keys: `['user', id]`, `['trainer', id]`, `['trainers']`, `['trainer-clients', trainerId]`.
- After mutations, **invalidate** all affected keys (see trainer assignment flow in APPLICATION_FLOWS §7).

### Forms

- **React Hook Form + Zod** for large wizards (see `AddTrainerModal`, `UsersPage` create).
- **Modal + local state** acceptable for smaller edit dialogs if already established on that page.

### Services

- All HTTP via `lib/api.ts` (axios instance with auth).
- One `*.service.ts` per API controller group; no raw `fetch` in pages.

### Permissions

- Gate buttons with permission helpers used elsewhere in `gym_client` (same pattern as dashboard nav).
- Do not invent new permission string literals — use backend `PermissionCodes` names.

---

## Backend patterns

### Controllers

- Thin controllers: validate → call service → map DTO.
- Use `[HasPermission(PermissionCodes.X)]` not ad-hoc role checks.

### Services

- Inject `IUnitOfWork`, not `ApplicationDbContext` in feature services (except `RbacService` / seeders where already done).
- Throw `NotFoundException`, `ConflictException` from `GymManagement.Core.Exceptions` for consistent API errors.

### Migrations

- `dotnet ef migrations add Name --project GymManagement.Infrastructure --startup-project GymManagement.API`
- Data backfill in migration SQL when renaming concepts (see `AddMembersAndStaffProfiles`).

---

## Legacy / do not extend for production

| Path | Status |
|------|--------|
| `gym_client/src/modules/trainers-management/` | Mock data + Zustand — **not** wired to API for main trainer list |
| `UserTypes` only (no `UserRoles`) | Legacy UI — provisioning syncs both; target state is roles-first |
| `Users` table for all member fitness fields | Transitional — `Members` table exists (P1) |

---

## Checklist: new feature touching people

- [ ] Is this RBAC (role) or business (coach assignment)?
- [ ] Does profile need `Members` / `Trainer` / `Staff` row?
- [ ] Called `UserProvisioningService` on create/update?
- [ ] Photo upload uses `ProfilePhotoEditor`?
- [ ] Query invalidation list documented in PR?
- [ ] Updated [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md) § if flow is new?
