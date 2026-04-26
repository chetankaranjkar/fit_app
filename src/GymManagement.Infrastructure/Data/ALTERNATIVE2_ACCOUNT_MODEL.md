# Alternative 2: Single Account Table + Roles

This document describes the **single Account (login) table** model that was added alongside the existing Admin and UserAccount tables.

## Design

- **User** = single "Person" table for everyone (members, instructors, admins). No rename was done; `User` is the identity table.
- **Account** = single login table:
  - `UserId` (FK to User, unique) – one account per person
  - `Username` (unique globally)
  - `PasswordHash`, `Role` (User, Instructor, Admin), `IsActive`, `LastLoginDate`
- **Instructor** = instructor profile linked to a User (`UserId`), as before.

So: one **identity** table (User) and one **login** table (Account) with roles. Username is unique in `Accounts`.

## Current Behavior

- **Login**: Auth tries **Account** first (by username). If not found, it falls back to **Admin** and **UserAccount** (legacy).
- **New deployments**: Seeder creates default admin as **User** + **Account** (username `admin`, password `admin123`). Legacy `SeedAdminAsync` still runs so existing DBs are unchanged.
- **AttendanceLog**: `LoggedByUserId` was added for admin logins via Account. Legacy `AdminId` is still used when logging in via the Admin table.

## Migration

- **AddAccountAndLoggedByUserId**: Creates `Accounts` and adds `LoggedByUserId` to `AttendanceLogs`. It does **not** drop `Admin` or `UserAccount`.

## Optional: Full Migration to Single Account

To move everything to the single Account model and drop legacy tables:

1. **Data migration** (run once, e.g. in a new migration or script):
   - From **UserAccount**: insert into `Accounts` (`UserId` from `UserAccount.UserId`, or from `Instructors.UserId` when `InstructorId` is set), `Username`, `PasswordHash`, `Role`, `IsActive`, etc.
   - From **Admin**: for each Admin, insert a **User** (FirstName, LastName, Email, …), then insert **Account** (`UserId` = new User.Id, Username, PasswordHash, Role = Admin). Update **AttendanceLog** rows that have `AdminId` to set `LoggedByUserId` to the new User Id for that admin, then drop column `AdminId` (in a later migration).
2. **Code**: Remove Auth fallbacks to Admin and UserAccount; use only Account.
3. **Migrations**: Drop tables `UserAccounts` and `Admins` (and remove `AdminId` from `AttendanceLogs` if not already done).

Until you do that, both the new Account-based login and the legacy Admin/UserAccount login are supported.
