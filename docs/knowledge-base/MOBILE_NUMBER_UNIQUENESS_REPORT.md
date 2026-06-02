# Global mobile number uniqueness — implementation report

## Business rule

One Indian mobile number (`Users.Phone`, API `phone`) may belong to **only one user** in the entire system, including soft-deleted users (**Option A**).

## 1. Existing duplicates found

Run before/after migration:

```bash
# SQL Server — see docs/scripts/find-duplicate-mobile-numbers.sql
```

Migration `20260605120000_EnforceGlobalMobileNumberUniqueness` clears duplicate rows (keeps lowest `Id`, nulls others) so the unique constraint can be applied safely.

## 2. Database constraints added

| Object | Purpose |
|--------|---------|
| `UQ_Users_MobileNumber` | Unique filtered index on `Users.Phone` WHERE `Phone IS NOT NULL` |
| `IX_Users_MobileNumber` | Non-unique index on `Phone` for search/lookups |

Column remains `Users.Phone` (not renamed) for API compatibility. Max length `nvarchar(10)`.

**Soft delete:** Uniqueness filter does **not** exclude `IsDeleted = 1` — deleted users still reserve their number.

## 3. APIs updated

| Endpoint / service | Behavior |
|--------------------|----------|
| `IMobileNumberAvailabilityService` | `CheckAsync`, `IsMobileNumberAvailableAsync`, `EnsureAvailableOrThrowAsync` |
| `GET /api/Users/check-mobile?mobile=&excludeUserId=` | Real-time availability for UI |
| `POST /api/Users` | Required mobile + global duplicate check |
| `PUT /api/Users/{id}` | Allows own number; blocks others' numbers |
| `PATCH /api/me/profile` (phone) | Same global rules with `excludeUserId` = current user |

Conflict message: **"This mobile number is already registered with another user."**

## 4. UI validations added

- Debounced check via `useMobileNumberAvailability` hook
- `MobileNumberAvailabilityHint`: ✓ Mobile Number Available / ✗ Mobile Number Already Registered
- Wired on: **Add Member**, **Edit Member**, **Add Trainer** (new user), **Edit Trainer** personal tab

## 5. Files modified

**Backend:** `PhoneNumberValidator.cs`, `MobileNumberAvailabilityDto.cs`, `IMobileNumberAvailabilityService.cs`, `MobileNumberAvailabilityService.cs`, `UserService.cs`, `UsersController.cs`, `MeController.cs`, `ApplicationDbContext.cs`, `Program.cs`, migration `20260605120000_EnforceGlobalMobileNumberUniqueness.cs`, snapshot

**Frontend:** `mobileAvailability.ts`, `users.service.ts`, `phone.ts`, `useMobileNumberAvailability.ts`, `MobileNumberAvailabilityHint.tsx`, `UsersPage.tsx`, `UserDetailPage.tsx`, `AddTrainerModal.tsx`, `TrainerDetailPage.tsx`

**Scripts / docs:** `docs/scripts/find-duplicate-mobile-numbers.sql`, this report, `PHONE_VALIDATION_AUDIT.md` (related)

## 6. Migration scripts

1. `20260604120000_NormalizeUserPhoneNumbers.cs` — normalize to 10 digits
2. `20260605120000_EnforceGlobalMobileNumberUniqueness.cs` — dedupe + `UQ_Users_MobileNumber` + `IX_Users_MobileNumber`

Apply:

```bash
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API
```

## Import validation

CSV import (`membersCsv.ts` + `UsersPage` import loop):

- Duplicate within file
- Duplicate against loaded list
- Server rejects with conflict message on `POST /Users`

## Normalization

All checks run **after** normalization (`+91`, spaces, hyphens → 10 digits, `^[6-9][0-9]{9}$`).
