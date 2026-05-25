# User Management & Role Architecture (Enterprise)

> **Operational flows & UI routes:** see [APPLICATION_FLOWS.md](./APPLICATION_FLOWS.md) and [REUSE_AND_CONVENTIONS.md](./REUSE_AND_CONVENTIONS.md).

> **Stack alignment:** This repository is **React + TypeScript** (frontend) and **ASP.NET Core 9 + EF Core + SQL Server** (backend), with JWT + refresh tokens and an existing RBAC layer (`Roles`, `UserRoles`, `Permissions`, `RolePermissions`).  
> The sections below use **PostgreSQL + UUID** as a portable *reference design* (and Prisma where noted). Implementation steps map to **your current .NET project**—do not introduce a parallel Node stack unless you intentionally split services.

---

## 1. Architecture explanation

### 1.1 Core principles

| Principle | Rule |
|-----------|------|
| **Single identity** | One row per person in `users` (identity + contact + lifecycle). |
| **Auth separation** | Credentials live in `auth_users` (email, password hash, refresh tokens)—never in profile tables. |
| **RBAC** | Authorization via `roles` + `user_roles` + `role_permissions` + `permissions`. |
| **Business profiles** | Optional 1:1 extension tables: `members`, `trainers`, `staff` keyed by `user_id`. |
| **No duplication** | Name, email, phone, avatar only on `users` / `auth_users`—never `trainer_name`, `member_name`. |
| **Multi-role** | Many `user_roles` rows per user (Admin + Trainer + Member simultaneously). |
| **Profile provisioning** | Assigning a role triggers idempotent creation of the matching profile row. |
| **Soft delete** | `deleted_at` on users and profiles; FKs use restrict or soft-delete filters—not hard cascade deletes of history. |

### 1.2 Layered model (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│  React (gym_client) — pages, forms, TanStack Query, Zod    │
└────────────────────────────┬────────────────────────────────┘
                             │ REST / JWT
┌────────────────────────────▼────────────────────────────────┐
│  GymManagement.API — Controllers, middleware, attributes    │
│    • JwtBearer + PermissionResolutionMiddleware             │
│    • [HasPermission] / policy-based authorization           │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  GymManagement.Core — DTOs, interfaces, domain services     │
│    • IUserProvisioningService (create user + roles + profiles)│
│    • IRbacService (effective permissions)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  GymManagement.Infrastructure — EF Core, repositories       │
│    • ApplicationDbContext, migrations, seeders              │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  GymManagement.Domain — entities, enums, invariants         │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Current codebase vs target

| Requirement | Today (GYM repo) | Target |
|-------------|------------------|--------|
| Users identity | `Users` (int PK) | Consolidate fields; add audit/soft-delete consistently |
| Auth | `AuthUsers` → `Users` | Keep; merge email display from `AuthUsers` |
| RBAC | `Roles` (`AppRole`), `UserRoles`, `Permissions` | **Keep**—rename mentally to spec’s Roles/UserRoles |
| Parallel “types” | `UserTypes` + `UserUserTypes` | **Deprecate**—migrate to `UserRoles` only |
| Trainer profile | `Trainer` → `UserId` | **Keep**—remove duplicate `ProfilePicture` over time |
| Member profile | On `User` + `UserDetail` | **Extract** → `Members` table |
| Staff profile | Missing | **Add** `Staff` |
| Member↔Coach link | `UserInstructors` | **Keep** (assignment, not role) |
| PK type | `int` | Optional phase-2: `uniqueidentifier` / UUID |
| ORM | EF Core | Stay (Prisma doc is reference only) |

### 1.4 Role vs profile vs assignment

```
                    ┌──────────────┐
                    │    users     │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ user_roles │  │  members   │  │  trainers  │  … staff
    └─────┬──────┘  └────────────┘  └────────────┘
          ▼
    ┌────────────┐
    │   roles    │──► role_permissions ──► permissions
    └────────────┘

    user_instructors (member user_id + trainer_id) = operational assignment, NOT a role
```

**Roles (authorization):** Admin, Member, Trainer, Staff, Receptionist, Accountant  
**Profiles (data):** Created when role is assigned  
**Assignments (business):** e.g. which coach trains which member (`UserInstructors`)

---

## 2. Database schema (PostgreSQL reference)

Use this as the canonical spec. Map 1:1 to EF entities when implementing.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ IDENTITY ============
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    mobile          VARCHAR(20),
    profile_image_url TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','suspended')),
    organization_id UUID,  -- multi-branch (nullable until branch module)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id),
    updated_by      UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX ux_users_mobile_active
    ON users (mobile) WHERE deleted_at IS NULL AND mobile IS NOT NULL;

CREATE TABLE auth_users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id),
    email               VARCHAR(256) NOT NULL,
    password_hash       VARCHAR(512) NOT NULL,
    refresh_token_hash  VARCHAR(512),
    refresh_token_expires_at TIMESTAMPTZ,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_end         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_auth_users_email
    ON auth_users (lower(email)) WHERE deleted_at IS NULL;

-- ============ RBAC ============
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50) NOT NULL UNIQUE,  -- ADMIN, MEMBER, TRAINER, STAFF, RECEPTIONIST, ACCOUNTANT
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(80) NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES users(id),
    revoked_at  TIMESTAMPTZ,
    UNIQUE (user_id, role_id)
);

CREATE INDEX ix_user_roles_user ON user_roles (user_id) WHERE revoked_at IS NULL;
CREATE INDEX ix_user_roles_role ON user_roles (role_id) WHERE revoked_at IS NULL;

-- ============ BUSINESS PROFILES (1:1 with users when role active) ============
CREATE TABLE members (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    fitness_goal        VARCHAR(100),
    height_cm           DECIMAL(5,2),
    weight_kg           DECIMAL(5,2),
    medical_conditions  TEXT,
    emergency_contact   VARCHAR(150),
    emergency_phone     VARCHAR(20),
    preferred_gym_time  VARCHAR(20),
    date_of_birth       DATE,
    gender              VARCHAR(20),
    registration_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ
);

CREATE TABLE trainers (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_code         VARCHAR(30) NOT NULL,
    specialization        VARCHAR(150),
    experience_years      INT,
    certification_details TEXT,
    salary_type           VARCHAR(20) CHECK (salary_type IN ('fixed','hourly','commission','hybrid')),
    base_salary           DECIMAL(12,2),
    commission_percentage DECIMAL(5,2),
    joining_date          DATE,
    hire_date               DATE NOT NULL DEFAULT CURRENT_DATE,
    max_active_clients      INT,
    availability_status   VARCHAR(30),
    is_personal_trainer   BOOLEAN NOT NULL DEFAULT true,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_trainers_employee_code
    ON trainers (employee_code) WHERE deleted_at IS NULL;

CREATE TABLE staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_code   VARCHAR(30),
    department      VARCHAR(80),   -- reception, accounts, operations
    job_title       VARCHAR(100),
    shift_type      VARCHAR(30),
    joining_date    DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

-- Member assigned to coach (not RBAC)
CREATE TABLE user_instructors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    trainer_id      UUID NOT NULL REFERENCES trainers(id),
    assignment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date        TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_user_instructors_trainer_active
    ON user_instructors (trainer_id) WHERE is_active AND end_date IS NULL;
```

### Cascading strategy

| Relationship | On delete |
|--------------|-----------|
| `users` → profiles | CASCADE soft-delete profiles when user soft-deleted |
| `user_roles` | RESTRICT on `roles`; CASCADE on `users` |
| `user_instructors` | RESTRICT; end assignment instead of delete |
| Financial / attendance history | **Never** cascade delete—FK to `users` with RESTRICT |

---

## 3. Prisma schema (reference only)

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  firstName String   @map("first_name")
  lastName  String   @map("last_name")
  mobile    String?
  profileImageUrl String? @map("profile_image_url")
  status    String   @default("active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime? @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  authUser   AuthUser?
  userRoles  UserRole[]
  member     Member?
  trainer    Trainer?
  staff      Staff?

  @@index([mobile])
  @@map("users")
}

model Role {
  id   String @id @default(uuid()) @db.Uuid
  code String @unique
  name String
  userRoles UserRole[]
  rolePermissions RolePermission[]
  @@map("roles")
}

model UserRole {
  id     String @id @default(uuid()) @db.Uuid
  userId String @map("user_id") @db.Uuid
  roleId String @map("role_id") @db.Uuid
  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])
  @@unique([userId, roleId])
  @@map("user_roles")
}
// … Member, Trainer, Staff, AuthUser analogous to SQL above
```

---

## 4. EF Core mapping (implement in this repo)

### 4.1 New / refactored entities

```csharp
// GymManagement.Domain/Entities/Member.cs
public class Member : BaseEntity
{
    public int UserId { get; set; }
    public string? FitnessGoal { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public string? MedicalConditions { get; set; }
    public string? EmergencyContact { get; set; }
    public string? EmergencyPhone { get; set; }
    public string? PreferredGymTime { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public DateTime RegistrationDate { get; set; }
    public bool IsActive { get; set; } = true;
    public User User { get; set; } = null!;
}

// GymManagement.Domain/Entities/Staff.cs — same pattern
```

Extend `BaseEntity` (phase 1 on int PK):

```csharp
public int? CreatedByUserId { get; set; }
public int? UpdatedByUserId { get; set; }
// Use IsDeleted + DeletedAt (add DeletedAt if missing)
```

### 4.2 Migration phases

| Phase | Work |
|-------|------|
| **P0** | Seed roles: ADMIN, MEMBER, TRAINER, STAFF, RECEPTIONIST, ACCOUNTANT |
| **P1** | Add `Members`, `Staff`; backfill from `Users` / `UserDetail` |
| **P2** | `IUserProvisioningService`: create user → assign roles → ensure profiles |
| **P3** | UI: role chips + profile tabs; deprecate `UserTypes` |
| **P4** | Optional UUID PK migration (new tables + mapping table) |

---

## 5. Service layer — provisioning flow

```csharp
public interface IUserProvisioningService
{
    Task<UserAggregateDto> CreateUserAsync(CreateUserAggregateRequest request, int actorUserId, CancellationToken ct = default);
    Task AssignRoleAsync(int userId, string roleCode, int actorUserId, CancellationToken ct = default);
    Task RevokeRoleAsync(int userId, string roleCode, int actorUserId, CancellationToken ct = default);
    Task<UserAggregateDto> GetUserAggregateAsync(int userId, CancellationToken ct = default);
    Task SoftDeleteUserAsync(int userId, int actorUserId, CancellationToken ct = default);
}

// Create flow (pseudocode)
// 1. Insert User (identity fields only)
// 2. Insert AuthUser if email/password provided
// 3. For each roleCode in request.Roles:
//      - Insert UserRole
//      - switch(roleCode):
//          MEMBER    → EnsureMemberProfile(userId)
//          TRAINER   → EnsureTrainerProfile(userId)
//          STAFF/RECEPTIONIST/ACCOUNTANT → EnsureStaffProfile(userId, department)
// 4. If request.AssignedTrainerId → UserInstructorService.Assign…
// 5. Return aggregate DTO
```

**Role → profile matrix**

| Role code | Profile table | Notes |
|-----------|---------------|-------|
| MEMBER | `members` | Required for gym access / billing |
| TRAINER | `trainers` | Auto `employee_code` |
| STAFF | `staff` | |
| RECEPTIONIST | `staff` | `department = reception` |
| ACCOUNTANT | `staff` | `department = accounts` |
| ADMIN | — | No extra profile |

---

## 6. API structure (REST)

Base: `/api/v1` (optional versioning)

| Method | Route | Permission | Description |
|--------|-------|------------|-------------|
| POST | `/users` | `CREATE_MEMBER` or `UsersAccess` | Create user + roles + profiles |
| GET | `/users/{id}` | `UsersAccess` | User + roles + profiles + permissions |
| PUT | `/users/{id}` | `MANAGE_MEMBERS` | Update identity fields |
| DELETE | `/users/{id}` | `MANAGE_MEMBERS` | Soft delete |
| POST | `/users/{id}/roles` | `MANAGE_ROLES` | `{ "roleCode": "TRAINER" }` |
| DELETE | `/users/{id}/roles/{roleCode}` | `MANAGE_ROLES` | Revoke |
| POST | `/users/{id}/member-profile` | `MANAGE_MEMBERS` | Upsert member fields |
| POST | `/users/{id}/trainer-profile` | `TrainerAccess` | Upsert trainer fields |
| POST | `/users/{id}/staff-profile` | `MANAGE_STAFF` | Upsert staff fields |
| GET | `/members` | `UsersAccess` | Paged members (join users) |
| GET | `/trainers` | `TrainerAccess` | Existing trainers API |
| GET | `/staff` | `MANAGE_STAFF` | Paged staff |

### Example: create user with multiple roles

```http
POST /api/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Nilesh",
  "lastName": "Gaware",
  "mobile": "9876543210",
  "email": "nilesh@gym.com",
  "password": "SecurePass123!",
  "roles": ["TRAINER", "MEMBER"],
  "memberProfile": {
    "fitnessGoal": "Strength",
    "preferredGymTime": "Morning"
  },
  "trainerProfile": {
    "specialization": "Personal Training",
    "experienceYears": 5,
    "commissionPercentage": 15
  }
}
```

Response:

```json
{
  "id": 42,
  "firstName": "Nilesh",
  "lastName": "Gaware",
  "roles": [
    { "code": "TRAINER", "name": "Trainer" },
    { "code": "MEMBER", "name": "Gym Member" }
  ],
  "memberProfileId": 10,
  "trainerProfileId": 3,
  "permissions": ["TrainerAccess", "BOOK_PT_SESSIONS", "..."]
}
```

---

## 7. Backend folder structure (existing solution)

```
src/
  GymManagement.Domain/
    Entities/          User, AuthUser, AppRole, UserRole, Member, Trainer, Staff
    Enums/             UserStatus, SalaryType
  GymManagement.Core/
    DTOs/Users/        CreateUserAggregateRequest, UserAggregateDto
    Services/          IUserProvisioningService, IRbacService
    Authorization/     PermissionCodes
  GymManagement.Infrastructure/
    Services/          UserProvisioningService.cs, RbacService.cs
    Data/              ApplicationDbContext, Configurations/, Seed/
    Migrations/
  GymManagement.API/
    Controllers/       UsersController, RolesController, MembersController, …
    Middleware/        PermissionResolutionMiddleware
    Attributes/        HasPermissionAttribute
```

---

## 8. Security

| Concern | Implementation (already partial in repo) |
|---------|------------------------------------------|
| JWT access token | Short TTL; claims: `sub`, `profile_user_id`, `role`, `permission` |
| Refresh token | `AuthUsers.RefreshToken` rotation + reuse detection |
| Password | BCrypt / ASP.NET hasher (existing `PasswordHasher`) |
| Role guards | `[HasPermission(PermissionCodes.X)]` |
| Live permissions | `PermissionResolutionMiddleware` merges DB + claims |
| Audit | `created_by` / `updated_by` on write APIs |

---

## 9. Frontend architecture (`gym_client`)

```
src/
  features/
    users/
      api/           users.api.ts, roles.api.ts
      hooks/         useUserAggregate, useAssignRole
      schemas/       userForm.schema.ts (Zod)
      components/
        UserForm.tsx           React Hook Form
        RoleAssignmentChips.tsx
        MemberProfileSection.tsx
        TrainerProfileSection.tsx
        StaffProfileSection.tsx
      pages/
        UsersPage.tsx
        UserDetailPage.tsx
  lib/
    api.ts
    apiErrors.ts
```

### Zod example

```typescript
export const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roles: z.array(z.enum(['ADMIN','MEMBER','TRAINER','STAFF','RECEPTIONIST','ACCOUNTANT'])).min(1),
  memberProfile: memberProfileSchema.optional(),
  trainerProfile: trainerProfileSchema.optional(),
})
```

### UI rules

1. **Roles** = checkboxes (multi-select) → `POST /users/{id}/roles`
2. **Profiles** = conditional sections shown when role selected
3. **Personal coach** = separate from role “Trainer” (assignment dropdown → `UserInstructors`)
4. **Members list** = filter `roles` includes `MEMBER`, not legacy `UserTypes`

---

## 10. Default role seeder

```csharp
public static readonly (string Code, string Name)[] DefaultRoles =
[
    ("ADMIN", "Administrator"),
    ("MEMBER", "Gym Member"),
    ("TRAINER", "Trainer"),
    ("STAFF", "Staff"),
    ("RECEPTIONIST", "Receptionist"),
    ("ACCOUNTANT", "Accountant"),
];
```

Map permissions (examples):

| Role | Sample permissions |
|------|-------------------|
| ADMIN | All / `Config` |
| MEMBER | Self-service portal |
| TRAINER | `TrainerAccess`, `BOOK_PT_SESSIONS` |
| RECEPTIONIST | `MANAGE_MEMBERS`, `MANAGE_ATTENDANCE`, leads |
| ACCOUNTANT | `MANAGE_PAYMENTS`, invoices |
| STAFF | Branch console subset |

---

## 11. Validation rules

| Field | Rule |
|-------|------|
| email | Unique among active `auth_users` |
| mobile | Unique among active `users` |
| roles | At least one for staff-facing accounts |
| TRAINER profile | `employee_code` unique; auto-generate if empty |
| MEMBER profile | `date_of_birth` optional; age ≥ 14 if set |
| password | Min 6–8 chars; complexity policy configurable |
| soft delete | Block if open billing unless `force` admin flag |

---

## 12. Best practices

1. **One provisioning service** — never create `Trainer` rows from three different controllers.
2. **Idempotent profile ensure** — `EnsureTrainerProfile(userId)` safe to call twice.
3. **Separate assignment from role** — coach assignment stays in `UserInstructors`.
4. **Deprecate `UserTypes`** — single source of truth: `UserRoles`.
5. **Aggregate read model** — `GET /users/{id}` returns nested DTO, not 5 round-trips.
6. **Event hooks (future)** — `UserRoleAssigned` → WhatsApp / audit log / cache invalidation.
7. **Multi-branch** — add `organization_id` to users and scope queries.

---

## 13. Future scalability

| Module | How this architecture helps |
|--------|----------------------------|
| PT sessions | `trainers.id` FK; permissions `MANAGE_PT_PACKAGES` |
| Commissions / payroll | `trainers.salary_type`, `commission_percentage` |
| Product sales | Staff/Receptionist roles + POS permissions |
| Diet plans | `members.user_id` FK |
| Mobile app | JWT + same `/api/users/me` aggregate |
| WhatsApp | Notify on `UserRoleAssigned`, membership events |
| Multi-branch | `organization_id` on `users`, branch-scoped `user_roles` |

---

## 14. Implementation status

### P1 — Done (2026-05-25)

- **Entities:** `Members`, `Staff` (1:1 with `Users`)
- **Migration:** `20260525130244_AddMembersAndStaffProfiles` (tables + backfill from `Users` / `UserDetails` / `UserTypes` / `UserRoles`)
- **Service:** `UserProvisioningService` — assign/revoke role, ensure profiles, sync from legacy `UserTypeIds`
- **Integration:** `UserService` create/update/delete uses provisioning
- **APIs:**
  - `GET /api/users/{id}/aggregate`
  - `POST /api/users/{id}/roles` body `{ "roleCode": "MEMBER" }`
  - `DELETE /api/users/{id}/roles/{roleCode}`
  - `GET /api/members`, `GET /api/staff`
- **Roles seeded:** `RECEPTIONIST`, `ACCOUNTANT` (+ existing ADMIN, STAFF, TRAINER, MEMBER)

### P2 — Next

1. React: role multi-select wired to `/users/{id}/roles` (reduce reliance on `UserTypes` only).  
2. Profile forms bound to `MemberProfile` / `StaffProfile` sections.  
3. Optional: migrate display fields off `Users` into `Members` only (read path).

**Do not** rewrite the backend in Node/Express unless building a new microservice—the current stack already meets this design with incremental refactoring.

---

## Appendix: Map spec names → current tables

| Spec | Current table |
|------|----------------|
| users | `Users` |
| auth_users | `AuthUsers` |
| roles | `Roles` (`AppRole`) |
| user_roles | `UserRoles` |
| permissions | `Permissions` |
| role_permissions | `RolePermissions` |
| trainers | `Trainer` |
| members | *split from `Users` + `UserDetail` → new `Members`* |
| staff | *new `Staff`* |
| user_instructors | `UserInstructors` |
