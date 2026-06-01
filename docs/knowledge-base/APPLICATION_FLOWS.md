# Application flows & product model

**Purpose:** Single source of truth for how the Gym Management app works end-to-end. Use this before adding features so we extend existing flows instead of duplicating logic.

**Related docs:**

| Doc | Contents |
|-----|----------|
| [CodeWorkflow.md](../CodeWorkflow.md) | HTTP pipeline, JWT, RBAC middleware |
| [USER_ROLE_ARCHITECTURE.md](./USER_ROLE_ARCHITECTURE.md) | Roles, profiles (`Members`, `Staff`, `Trainers`), provisioning |
| [PT_MODULE.md](../PT_MODULE.md) | Personal training packages & sessions |
| [USER_GUIDE.md](../USER_GUIDE.md) | End-user operations |
| [README.md](./README.md) | Knowledge-base index |

**Last updated:** 2026-06-01 (Enterprise membership billing, payments, waive-offs).

---

## 1. Stack (actual repo)

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite (`gym_client/`) |
| API | ASP.NET Core 9 (`src/GymManagement.API/`) |
| Data | EF Core + **SQL Server** (`GymManagementDb`) |
| Auth | JWT + refresh token on `AuthUsers` |

Do **not** assume Node/PostgreSQL/Prisma unless starting a new service.

---

## 2. High-level architecture

```mermaid
flowchart TB
    subgraph client [gym_client]
        Pages[Pages / routes]
        Services[*.service.ts axios]
        Shared[components/users trainers ui]
    end
    subgraph api [GymManagement.API]
        Ctrl[Controllers]
        MW[Auth + Permission middleware]
    end
    subgraph infra [Infrastructure]
        Svc[UserService TrainerService UserProvisioningService ...]
        UoW[UnitOfWork + EF]
    end
    subgraph db [SQL Server]
        Users[Users AuthUsers]
        RBAC[Roles UserRoles Permissions]
        Profiles[Members Staff Trainer]
        Ops[UserInstructors Memberships Attendance ...]
    end
    Pages --> Services --> Ctrl
    Ctrl --> MW --> Svc --> UoW --> db
```

---

## 3. Identity model (critical)

One **person** = one row in `Users`. Login = `AuthUsers` (email, password) → `UserId`.

| Concept | Table / API | UI label |
|---------|-----------|----------|
| **RBAC role** | `Roles` + `UserRoles` | Admin, Member, Trainer, Staff, … |
| **Legacy label** | `UserTypes` + `UserUserTypes` | Checkboxes in edit profile — **syncing to roles via `UserProvisioningService`** |
| **Member profile** | `Members` (1:1 `UserId`) | Gym member fields |
| **Trainer profile** | `Trainer` (1:1 `UserId`) | Specialization, rates, employee code |
| **Staff profile** | `Staff` (1:1 `UserId`) | Department, employee code |
| **Coach assignment** | `UserInstructors` | “Personal coach” on member — **not** the Trainer role |

### Common mistake

| User action | Wrong expectation | Correct behavior |
|-------------|-----------------|------------------|
| Check user type **Trainer** on a member | Shows on trainer **Clients** tab | Only creates staff trainer profile; assign coach via **Personal coach** dropdown |
| Member only has type **Trainer** | Appears in **Users → Members** list | Members list filters `UserTypes` containing **Member** — keep Member type |

### Provisioning entry point

**`IUserProvisioningService`** (`UserProvisioningService.cs`):

- `AssignRoleAsync` / `RevokeRoleAsync`
- `EnsureMemberProfileAsync` / `EnsureTrainerProfileAsync` / `EnsureStaffProfileAsync`
- `SyncFromUserTypeIdsAsync` — maps UserTypes → Roles + profiles

`UserService` create/update/delete should call provisioning — do not create `Trainer` rows in random controllers.

---

## 4. Frontend routes (dashboard)

| Route | Page | Primary API |
|-------|------|-------------|
| `/dashboard/users` | Members list | `GET /api/Users` (filter `userTypes` includes Member) |
| `/dashboard/users/:id` | Member detail | `GET /api/Users/{id}`, memberships, schedules |
| `/dashboard/trainers` | Trainers list | `GET /api/Trainers` |
| `/dashboard/trainers/:id` | Trainer detail | `GET /api/Trainers/{id}`, tabs: Clients, Schedule, … |
| `/dashboard/trainers/:id?mode=edit` | Opens edit modal | |

Auth: token in client storage; permissions gate menu items (`PermissionCodes`).

---

## 5. Flow: Create gym member

```mermaid
sequenceDiagram
    participant UI as UsersPage
    participant API as UsersController
    participant US as UserService
    participant PR as UserProvisioningService
    UI->>API: POST /api/Users (role Member, userTypeIds)
    API->>US: CreateUserAsync
    US->>US: Insert Users, optional AuthUser, membership
    US->>PR: SyncFromUserTypeIds + EnsureMemberProfile
    US->>PR: AssignOrReplaceMemberTrainer if trainerId set
    API-->>UI: UserDto
```

**Frontend:** `UsersPage.tsx` → `usersService.create`  
**Backend:** `CreateUserDto.TrainerId` → `UserInstructors` (coach), not trainer role.

---

## 6. Flow: Create / link trainer

Two paths:

1. **Add trainer modal** (`AddTrainerModal.tsx`): link existing user `POST /api/Trainers` or create user with Trainer type then update trainer fields.
2. **User edit:** User type Trainer + `UserProvisioningService` ensures `Trainer` row and `TRAINER` role.

Employee code: auto-generated `TRN-{year}-{######}` (`TrainerEmployeeCodeGenerator`).

---

## 7. Flow: Assign member to coach

```mermaid
sequenceDiagram
    participant UI as UserDetailPage edit profile
    participant API as UsersController
    participant US as UserService
    participant UI_svc as UserInstructorService
    UI->>API: PUT /api/Users/{id} trainerId
    API->>US: UpdateUserAsync
    US->>UI_svc: AssignOrReplaceMemberTrainerAsync(userId, trainerId)
    Note over UI: Trainer Clients tab reads GET /api/Trainers/{id}/clients
```

**Invalidate queries:** `trainer-clients`, `user`, `users`, `trainer` after assignment.

---

## 8. Flow: Edit trainer profile (UI)

**Route:** `/dashboard/trainers/:trainerId` → **Edit profile** modal with two tabs:

| Tab | Data target | APIs |
|-----|-------------|------|
| **Personal details** | `Users` | `PUT /api/Users/{userId}`, photo `POST /api/FileUpload/profile/user/{userId}` |
| **Trainer module** | `Trainer` | `PUT /api/Trainers/{id}` |

Photo UI: shared **`ProfilePhotoEditor`** (camera + device + URL) — same as member edit.

---

## 9. Flow: Login & permissions

See [CodeWorkflow.md](../CodeWorkflow.md).

Summary: `POST /api/Auth/login` → JWT with roles + permission claims → `PermissionResolutionMiddleware` merges DB permissions → `[HasPermission]` on controllers.

**Web OTP (Firebase):** When `Firebase:Enabled` is true and Admin credentials + web config are set, login page shows **Password | OTP** tabs. Client loads public config from `GET /api/Auth/firebase-config`, sends SMS via Firebase Phone Auth, then exchanges the Firebase ID token at `POST /api/Auth/firebase-login`. Backend verifies token with Firebase Admin SDK and matches `AuthUsers` by `Users.Phone` (or email claim). Same JWT/session response as password login. Requires user phone on profile to match verified number.

**Change password (self-service):** Any authenticated user with an `AuthUsers` row can update their own password. `GET /api/Auth/account` returns login email and whether `currentPassword` is required (false for OTP-only accounts with no password hash yet). `POST /api/Auth/change-password` validates current password when required, min length 6, BCrypt hash on `AuthUsers`. **Web:** `/dashboard/profile` → **Password** card (`ChangePasswordCard`). **Mobile:** Profile → **Security & devices** → **Change password** (`/profile/change-password`). Admins can still reset another user’s password via `PUT /api/Users/{id}` (admin only).

---

## 10. Reuse catalog (avoid duplication)

### Frontend (`gym_client/src`)

| Need | Use | Do not copy from |
|------|-----|------------------|
| Profile photo upload/camera | `components/users/ProfilePhotoEditor.tsx` | `UserDetailPage` inline camera state |
| Camera modal | `components/users/ProfilePhotoCameraModal.tsx` | — |
| Camera helpers | `lib/cameraMedia.ts` | — |
| API errors | `lib/apiErrors.ts` `getApiErrorMessage` | ad-hoc axios parsing |
| Change own password | `auth.service.ts` + `ChangePasswordCard` | duplicate forms |
| Trainers CRUD | `services/trainers.service.ts` | mock `trainers-management` store (legacy) |
| Users CRUD | `services/users.service.ts` | — |
| Trainer add wizard | `components/trainers/AddTrainerModal.tsx` | `TrainersManagementPage` mock |

### Backend (`src/`)

| Need | Use |
|------|-----|
| User + role + profiles | `IUserProvisioningService` |
| Trainer assignment | `IUserInstructorService.AssignOrReplaceMemberTrainerAsync` |
| RBAC checks | `IRbacService` + `PermissionCodes` |
| Trainer employee code | `TrainerEmployeeCodeGenerator` |
| Staff employee code | `StaffEmployeeCodeGenerator` |
| Unit of work | `IUnitOfWork` — add repos there when new tables |

### When adding a new “person-like” profile

1. Add table 1:1 `UserId` in Domain.  
2. Register in `ApplicationDbContext` + `IUnitOfWork`.  
3. Extend `UserProvisioningService.EnsureProfileForRoleAsync`.  
4. Expose DTO + optional `GET /api/{profile}` list.  
5. Reuse `ProfilePhotoEditor` on frontend (identity photo stays on `Users`).

---

## 11. API quick reference

| Area | Base route |
|------|------------|
| Auth | `/api/Auth` |
| Users | `/api/Users` |
| User aggregate | `GET /api/Users/{id}/aggregate` |
| Assign role | `POST /api/Users/{id}/roles` body `{ roleCode }` |
| Members list | `GET /api/Members` |
| Staff list | `GET /api/Staff` |
| Trainers | `/api/Trainers`, `GET/POST .../clients` |
| Upload photo | `POST /api/FileUpload/profile/user/{userId}` |
| Permissions | `GET /api/Users/{id}/permissions` |
| Live workout tracking | `/api/workout/*` (see §14) |
| Health profile | `/api/HealthProfile` (see §15) |

---

## 15. Health Profile (medical screening)

Normalized tables: `users_health_profile`, `users_medical_conditions`, `users_medications`, `users_injuries`, `users_emergency_contacts`. Risk level (`Low` / `Moderate` / `High`) computed on save via `HealthProfileRiskEngine`.

| Step | API | UI |
|------|-----|-----|
| Staff edit member | `PUT /api/HealthProfile/user/{userId}` | `/dashboard/users/:userId/health-profile` |
| Member self-service | `PUT /api/HealthProfile/me` | `/dashboard/member/health-profile` |
| Trainer / staff read | `GET /api/HealthProfile/user/{userId}/summary` | User detail banner, workout assignment modal |

Trainers assigned via `UserInstructors` can read (not write) a client's profile. Assign workouts only after reviewing summary panel.

**Code:** `HealthProfileService`, `HealthProfileController`, `gym_client/src/modules/health-profile/`.

---

## 16. Supplement Tracking (member protocols)

Catalog + assignments (distinct from legacy `UserSupplements` free-text table and from retail POS inventory).

| Table | Purpose |
|-------|---------|
| `supplements_master` | Name, category, default dosage, active flag, optional `ProductId` → `Retail_Products` |
| `member_supplements` | Per-member assignment: dosage, timing, dates, status, assigned-by, optional product link |

| Step | API | UI |
|------|-----|-----|
| Manage catalog | `GET/POST/PUT/DELETE /api/SupplementMaster` | `/dashboard/supplements/master` |
| Assign to member | `POST /api/MemberSupplements` | User detail panel, `/dashboard/users/:userId/supplements` |
| Member read | `GET /api/MemberSupplements/me` | `/dashboard/member/supplements` |
| Trainer/staff read | `GET /api/MemberSupplements/user/{id}` | User detail (compact), full page + timeline |
| Analytics | `GET /api/MemberSupplements/analytics` | Catalog page dashboard strip |

**Auth:** trainers read/write clients via `UserInstructors`; staff via `UsersAccess`; members read own assignments only.

**Code:** `SupplementTrackingService`, `SupplementMasterController`, `MemberSupplementsController`, `gym_client/src/modules/supplement-tracking/`.

**Migrate:** `20260530194055_AddSupplementTrackingModule`.

---

## 14. Live workout tracking (member execution)

**Templates** stay on `WorkoutPlans` / `WorkoutPlanExercises`. **Performed** work is stored on existing `WorkoutSessions` (extended columns) plus new `WorkoutSessionExercises` (per set). Legacy `WorkoutLogs` + `MeController` complete-session flow remain unchanged.

| Step | API | UI |
|------|-----|-----|
| Resolve member id | `GET /api/workout/my-member-id` | `useMemberId` hook |
| Start | `POST /api/workout/start` `{ memberId, workoutPlanId }` | `/dashboard/member/workouts/today` |
| Active session | `GET /api/workout/active/{memberId}` | `/dashboard/member/workouts/live` |
| Log set | `POST /api/workout/log-set` | Live page per-set Save |
| Complete | `POST /api/workout/complete/{sessionId}` | Live page Complete |
| History | `GET /api/workout/exercise-history/{memberId}/{exerciseId}` | History modal on live page |
| Dashboard stats | `GET /api/workout/dashboard/{memberId}` | `WorkoutDashboardWidget` on member dashboard |
| Trainer visibility | `GET /api/workout/trainer/members` | Trainer dashboard panel |

**Rules:** one `InProgress` session per member; completion % = completed sets / total sets; volume = Σ(weight × reps). On complete, rows sync into `WorkoutLogs` for backward-compatible history.

**Code:** `WorkoutTrackingService`, `WorkoutTrackingController`, `gym_client/src/modules/workout-tracking/`.

**Mobile (PulseFit / `mobile app/`):** `SessionRecoveryService` (local → server → start), `OfflineWorkoutRepository` (Hive), `SyncManager` (queue, 60s periodic, connectivity), autosave every 20s. Mirror after each online log; clear only on confirmed complete. Sync chip on Home / Profile / Live.

| Role | API | Web route |
|------|-----|-----------|
| Trainer timeline | `GET /api/workout/trainer/members/{memberId}/timeline` | `/dashboard/training/member-workouts/:memberId` |
| Admin monitoring | `GET /api/workout/admin/monitoring` | `/dashboard/training/workout-monitoring` |

**Active API** `GET /api/workout/active/{memberId}` returns envelope (`session`, `lastSyncedAt`, `serverTimeUtc`). Unique index: one `InProgress` session per member.

**Migrate:** `dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API` (migrations `AddWorkoutTrackingSessionExercises`, `WorkoutOneActiveSessionPerMember`).

---

## 12. Enterprise membership billing & payments

**Tables:** `membership_payments` (billing header per `user_memberships`), `membership_payment_transactions` (installments with receipt, status, void/refund audit), `waive_off_requests`, `financial_audit_logs`.

### Financial formula

```
Net Payable = Membership Fee − Coupon Discount − Approved Waive-Off
Outstanding = Net Payable − Sum(Completed installment amounts)
```

Only transactions with **Status = Completed** count toward paid/outstanding. **Voided** and **Refunded** rows stay in history but are excluded from totals.

### Routes (web)

| Route | Purpose |
|-------|---------|
| `/dashboard/payments` | Billing hub + legacy payment log |
| `/dashboard/payments/collect?membershipId=` | Collect installment (confirmation modal, duplicate check, receipt) |
| `/dashboard/payments/history` | Transaction list, filters, void/refund |
| `/dashboard/payments/waive-offs` | Request list; admin approve/reject |
| `/dashboard/payments/reports` | Collection, outstanding, coupon, waive-off, void/refund reports + CSV export |
| User detail → **Payment History** tab | Financial summary card, member ledger, billing table |

### APIs

| Area | Base route |
|------|------------|
| Membership billing | `/api/membership-payments` |
| Waive-off | `/api/waive-off-requests` |
| Coupon on billing | `/api/membership-payments/{id}/apply-coupon` |

**Permissions:** `Payments` (collect, view), `VOID_PAYMENT` (manager+ void), `REFUND_PAYMENT` (admin refund), `APPROVE_WAIVE_OFF` (admin waive-off), `VIEW_FINANCIAL_AUDIT` (audit log), `Reports` (collection reports).

**Migrate:** `dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API` (migration `20260601120000_EnterpriseBillingPaymentsWaiveOff`).

**Code:** `MembershipPaymentService`, `WaiveOffRequestService`, `BillingCalculationService`, `gym_client/src/components/billing/*`, `CollectMembershipPaymentPage`, `MembershipPaymentHistoryPage`, `WaiveOffRequestsPage`.

---

## 13. Device management & session security (mobile)

**Tables:** `UserDevices`, `UserSessions`, `LoginHistory` (see migration `20260531130000_AddDeviceManagementModule`).

**Mobile login:** `POST /api/Auth/login` accepts optional `device` payload (unique id, model, platform, app version). Server registers/updates device, enforces **max 3 active devices** (`DeviceSecurity:MaxActiveDevices`), creates `UserSessions` row (JWT `jti` + refresh hash), writes `LoginHistory`, and may return `securityAlert` (new device / unusual location). Device limit → **409** `DEVICE_LIMIT_REACHED` with active device list; client may retry with `removeDeviceId`.

**Session rules:** JWT access **8 hours** (480 min), refresh **90 days** dev / **14 days** production (`Jwt:AccessTokenMinutes`, `Jwt:RefreshTokenDays`). `JwtSessionValidationMiddleware` rejects revoked mobile sessions; web logins without `UserSessions` row still work. Web UI warns 2 minutes before access token expiry and can refresh via refresh token.

**Member APIs (`/api/me`):**

| Route | Purpose |
|-------|---------|
| `GET /devices?currentDeviceUniqueId=` | List active devices |
| `DELETE /devices/{id}` | Remove device + invalidate its sessions |
| `POST /devices/logout-all` | Revoke all sessions for user |
| `GET /login-history` | Login audit for member |

**Admin:** `GET /api/admin/device-security/analytics` (Reports permission) — dashboard on **Security** page.

**Mobile UI:** Profile → **Security & devices** → device cards, login history, logout all. Login shows device-limit sheet when 409.

**Migrate:** `dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API`

---

## 14. Improvement backlog (doc-owned)

Track cross-cutting refactors here; move to PRODUCT_BACKLOG when scheduled.

- [ ] **P2:** React role chips wired to `/users/{id}/roles`; reduce reliance on `UserTypes` only.
- [ ] **P2:** Extract shared “edit person” form sections (personal fields) used by User + Trainer modals.
- [ ] Deprecate `modules/trainers-management` mock Zustand UI or gate behind dev flag.
- [ ] Move member-only fields from `Users` → `Members` read path (display from `Members` first).
- [ ] `FileUpload` trainer endpoint use in UI if photo stored only on `Trainer` row.
- [ ] Document each major module in `docs/modules/*.md` (retail, leads, gym-ops).

---

## 15. How to update this doc

When you change a **user-visible flow** or add a **shared component**:

1. Update the relevant section above (or add a § under module).  
2. Add a line to §12 if follow-up refactor is needed.  
3. Bump **Last updated** at the top.  
4. Keep `.cursor/rules/gym-application-context.mdc` in sync if “always do X” rules change.
