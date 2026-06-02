# Phone validation audit — Indian mobile (10 digits)

## Standard

- Country: India
- Format: `^[6-9][0-9]{9}$` (stored as 10 digits, no spaces)
- API/DB column: `Users.Phone` (JSON `phone`). Unique index: `IX_Users_MobileNumber`.

## Files updated

### Backend

| File | Change |
|------|--------|
| `GymManagement.Core/Validation/PhoneNumberValidator.cs` | Normalize (+91, spaces), validate, required/optional helpers |
| `GymManagement.Infrastructure/Services/UserService.cs` | Required on create/update phone; emergency phone validated; duplicate check |
| `GymManagement.Infrastructure/Data/ApplicationDbContext.cs` | `Phone`/`EmergencyPhone` max 10; index `IX_Users_MobileNumber` |
| `GymManagement.Infrastructure/Migrations/20260604120000_NormalizeUserPhoneNumbers.cs` | Data cleanup, column shrink, index rename |

### Frontend

| File | Change |
|------|--------|
| `gym_client/src/lib/phone.ts` | `validatePhoneNumber`, `normalizePhoneNumber` |
| `gym_client/src/lib/validation.ts` | Re-exports phone + Aadhaar validators |
| `gym_client/src/lib/aadhaar.ts` | `validateAadhaarNumber` alias |
| `gym_client/src/lib/membersCsv.ts` | Required phone column, row errors, in-file duplicates |
| `gym_client/src/pages/UsersPage.tsx` | Required phone, emergency phone, import errors |
| `gym_client/src/pages/UserDetailPage.tsx` | Edit profile validation |
| `gym_client/src/components/trainers/AddTrainerModal.tsx` | Required phone on new trainer user |
| `gym_client/src/pages/TrainerDetailPage.tsx` | Personal + emergency phone validation |

## Validation rules added

1. Strip non-digits; accept `+91`, `91-`, spaces, hyphens → last 10 digits when length ≥ 10.
2. Reject if not exactly 10 digits after normalization.
3. Reject if first digit not in 6–9.
4. Emergency / alternate contact: optional, same rules when provided.
5. Create user: phone required. Update user: phone required when `phone` field sent.

## Duplicate checks

- **API:** `EnsurePhoneNotDuplicateAsync` → `409` with message `Phone number already exists`.
- **UI:** Blur/submit checks against current list page.
- **CSV:** Per-row and within-file duplicate detection before `POST /Users`.

## Search

- Existing `UserService` search already supports partial digit match on `Phone` (e.g. `98765`).

## Existing invalid records (post-migration)

Migration `20260604120000_NormalizeUserPhoneNumbers`:

1. Normalizes formatted numbers to 10 digits where possible.
2. Sets `Phone` / `EmergencyPhone` to `NULL` when normalization fails Indian rules.
3. Clears duplicate phones (keeps lowest `Id`, nulls others).

**After migrate**, find remaining gaps:

```sql
-- Users without a valid mobile (legacy)
SELECT Id, FirstName, LastName, Phone, EmergencyPhone
FROM Users
WHERE IsDeleted = 0 AND (Phone IS NULL OR Phone NOT LIKE '[6789][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');
```

Re-collect phone numbers via **Edit profile** on member/trainer detail pages.

## Apply migration

```bash
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API
```

## Note on `MobileNumber` naming

The product spec uses *MobileNumber*; the database and API keep **`Phone`** / **`phone`** to avoid breaking clients. The unique index is named **`IX_Users_MobileNumber`**.
