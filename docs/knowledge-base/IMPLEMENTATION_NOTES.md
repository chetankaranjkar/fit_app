# Implementation notes (P1 identity & trainer UX)

Snapshot of work completed for trainer/member visibility, provisioning, and shared UI. See [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md) for full flows.

**Last updated:** 2026-05-25

---

## Database (EF migration `20260525130244_AddMembersAndStaffProfiles`)

- Tables **`Members`** and **`Staff`** (1:1 `UserId` with `Users`).
- Backfill from existing user data where applicable.
- Roles **`RECEPTIONIST`**, **`ACCOUNTANT`** and matching user types in seeder.

Apply locally:

```bash
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API
```

---

## `UserProvisioningService`

Single entry for:

- `AssignRoleAsync` / `RevokeRoleAsync`
- `EnsureMemberProfileAsync` / `EnsureTrainerProfileAsync` / `EnsureStaffProfileAsync`
- `SyncFromUserTypeIdsAsync` — maps legacy **UserTypes** → **Roles** + profiles

`UserService` create/update/delete should call provisioning; avoid creating `Trainer` rows in random controllers.

API additions:

- `GET /api/Users/{id}/aggregate`
- `POST /api/Users/{id}/roles` — body `{ roleCode }`
- `DELETE /api/Users/{id}/roles/{roleCode}`
- `GET /api/Members`, `GET /api/Staff`

---

## Product rules (common mistakes)

| Situation | Correct behavior |
|-----------|------------------|
| User type **Trainer** on a member | Does **not** put them on trainer **Clients** tab; use **Personal coach** (`UserInstructors`) |
| **Members** list | Filters users with **Member** user type — keep Member type when saving |
| Photo | Identity on **`Users`**; trainer hero may also set `Trainer.profilePicture` |
| Trainer employee code | Auto `TRN-{year}-{######}` |
| Staff employee code | Auto pattern via `StaffEmployeeCodeGenerator` |

---

## Trainer edit UI

Route: `/dashboard/trainers/:id` → **Edit profile** modal:

| Tab | Persists to | APIs |
|-----|-------------|------|
| Personal details | `Users` | `PUT /api/Users/{userId}`, `POST /api/FileUpload/profile/user/{userId}` |
| Trainer module | `Trainer` | `PUT /api/Trainers/{id}` |

Photo tab uses shared **`ProfilePhotoEditor`** (same as member edit).

---

## Follow-up (tracked in APPLICATION_FLOWS §12)

- P2: Wire role chips to `/api/users/{id}/roles`; reduce UserTypes-only UI.
- P2: Extract shared “edit person” form for User + Trainer modals.
- Deprecate mock `trainers-management` module for production paths.
- Optional per-module docs under `docs/modules/*.md`.
