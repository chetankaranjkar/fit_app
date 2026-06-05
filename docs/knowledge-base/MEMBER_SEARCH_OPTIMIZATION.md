# Member search optimization

## Scope

Primary flow: **Members list** (`/dashboard/users`) and **Global search** → `GET /api/Users/paged?membersOnly=true&search=…`

---

## 1. Bottlenecks (before)

| Area | Issue | Impact |
|------|--------|--------|
| **SQL** | `EF.Functions.Like('%term%')` on `FirstName`, `LastName`, `Phone`, `AuthUsers.Email` | Full table scan on 16k+ rows |
| **SQL** | `AuthUsers` subquery with `%term%` on every search | Extra scan of auth table |
| **SQL** | `UserUserTypes.Any(...)` correlated subquery for `membersOnly` | EXISTS per user row |
| **SQL** | `COUNT(*)` always before page query | Doubles work when many matches |
| **Indexes** | No indexes on `FirstName` / `LastName` | Name search cannot seek |
| **Frontend** | 300–350 ms debounce, min **2** chars | API called too often |
| **Frontend** | No request abort | Stale responses possible |
| **Frontend** | No `keepPreviousData` | Grid flicker on each keystroke |

**Not N+1 on paged path:** enrichment (auth, roles, billing, trainer) is batched per page.

---

## 2. Missing indexes (addressed)

Migration: `20260604180000_MemberSearchPerformanceIndexes`

| Table | Index | Purpose |
|-------|--------|---------|
| `Users` | `IX_Users_FirstName` (filtered `IsDeleted=0`) | Prefix name search |
| `Users` | `IX_Users_LastName` (filtered) | Prefix name search |
| `Users` | `IX_Users_IsDeleted_RegistrationDate_Id` | Default sort + soft-delete filter |
| `UserUserTypes` | `IX_UserUserTypes_UserTypeId_UserId` (filtered) | `membersOnly` lookup |

**Already present:** `UQ_Users_MobileNumber`, `IX_Users_AadhaarNumber`, `IX_AuthUsers_Email`, `IX_Users_RegistrationDate`.

---

## 3. Query optimization (after)

`UserSearchTerm` classifies input → `UserSearchQueryExtensions`:

| Input | Predicate | SQL pattern |
|-------|-----------|-------------|
| 10 digits | Phone exact | `Phone = @p` (unique index) |
| 12 digits | Aadhaar exact | `AadhaarNumber = @p` |
| 3–11 digits | Phone/Aadhaar prefix | `LIKE 'digits%'` |
| Contains `@` | Login email prefix | `AuthUsers.Email LIKE 'term%'` |
| `First Last` | Full name | `FirstName LIKE 'a%' AND LastName LIKE 'b%'` |
| Other (≥2 chars API / ≥3 UI) | Text prefix | `FirstName/LastName/Phone/Email LIKE 'term%'` |

**Trade-off:** Substring match in the **middle** of a name (e.g. `ohn` → John) is no longer supported; prefix search is required for performance at scale.

**COUNT:** Skipped when the page returns fewer than `pageSize` rows (exact total known). Full pages still run one `COUNT(*)`.

**API contract:** Unchanged — same URL, params, and `PagedResultDto` shape. Backend still accepts 2-character search for other clients; UI uses 3 characters.

---

## 4. Frontend changes

| Setting | Before | After |
|---------|--------|-------|
| Debounce | 300–350 ms | **500 ms** |
| Min chars | 2 | **3** |
| Abort | None | `AbortSignal` on `getPaged` |
| Loading | Footer only | Toolbar spinner + `keepPreviousData` |

Shared constants: `gym_client/src/lib/userSearch.ts`

---

## 5. Before vs after (estimated)

| Scenario | Before (est.) | After (est.) |
|----------|---------------|--------------|
| Search `Rahul` (common prefix) | 5–60 s | **&lt; 500 ms** |
| Search `9876543210` (phone) | 1–10 s | **&lt; 50 ms** |
| Search `3333…` (Aadhaar partial) | 10–60 s | **&lt; 200 ms** |
| Empty list page 1 (16k members) | 2–5 s | **1–2 s** (indexes + conditional COUNT) |
| Keystroke API calls | Every 2+ chars @ 350 ms | Every 3+ chars @ 500 ms (~70% fewer calls) |

*Run `dotnet ef database update` on UAT/prod to apply indexes.*

---

## 6. 100k+ members — recommended next steps

1. **Persisted `SearchText` column** on `Users`: `FirstName + ' ' + LastName + ' ' + Phone + ' ' + AadhaarNumber`, maintained on insert/update; index + prefix search on one column.
2. **SQL Server Full-Text Index** on `SearchText` + `AuthUsers.Email` for contains/word-break search without `%term%` scans.
3. **Redis cache** for first page of empty search (member count + recent registrations), TTL 30–60 s.
4. **Read replica** for search-heavy reporting if write load grows.

Best balance for 100k: **SearchText + Full-Text Index**; keep current prefix path as fast path for phone/Aadhaar exact match.

---

## 7. Test cases

Automated: `tests/GymManagement.Core.Tests/UserSearchTermTests.cs`

Manual checklist:

- [ ] First name prefix (`Rah`)
- [ ] Last name prefix (`Sharma`)
- [ ] Full name (`Rahul Sharma`)
- [ ] Phone exact (10 digits)
- [ ] Phone partial (6+ digits)
- [ ] Email / login prefix (`member@`)
- [ ] Aadhaar exact (12 digits)
- [ ] Empty search — full paged list
- [ ] 1–2 characters — no API search (UI); list unchanged
- [ ] Pagination page 2+ with search
- [ ] Sort order (registration date desc)
- [ ] Status filter + search combined
- [ ] Global search typeahead
- [ ] Authorization unchanged (403 without `UsersAccess`)

---

## 8. Key files

| Layer | Path |
|-------|------|
| Term classifier | `src/GymManagement.Core/Search/UserSearchTerm.cs` |
| EF extensions | `src/GymManagement.Infrastructure/Search/UserSearchQueryExtensions.cs` |
| Service | `src/GymManagement.Infrastructure/Services/UserService.cs` → `GetUsersPagedAsync` |
| Migration | `src/GymManagement.Infrastructure/Migrations/20260604180000_MemberSearchPerformanceIndexes.cs` |
| Client constants | `gym_client/src/lib/userSearch.ts` |
| Members UI | `gym_client/src/pages/UsersPage.tsx` |
| Global search | `gym_client/src/components/layout/GlobalSearch.tsx` |
