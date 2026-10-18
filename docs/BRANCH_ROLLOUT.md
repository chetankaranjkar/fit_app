# Branch operations rollout

Status of this change: **Implemented in the repository. Not migrated on UAT or production. Not deployed.**

## What the expand migration does

`20261018180000_BranchOperationsExpand` adds nullable links. It does **not** assign existing users, leads, memberships, payments, or attendance to a branch. It does **not** copy plan prices onto branches.

The only data rewrite is coupon scope:

- A coupon with no branch list becomes `BranchScope = AllBranches`.
- A coupon that already lists branch ids becomes `SelectedBranches`.

`AllBranches` means every current and future branch in that coupon's organization, not every organization.

## Deployment order

1. Back up the database.
2. Deploy the API build that contains this migration. Startup migration adds the columns and tables. Old web and mobile clients keep working because the new fields are optional on responses.
3. Deploy the web client so new members and leads send a branch.
4. Deploy the mobile app when home-branch display is required. Older apps ignore the new profile fields.
5. Administrators assign home branches to existing people. Do not infer a home branch from attendance or QR scans.
6. After that assignment report is empty, a later migration may make `HomeBranchId` required for new rows. That constraint is **not** in this migration.

## Existing data that still needs an administrator

- Users with `HomeBranchId` null are **Branch not assigned**.
- Leads with `InterestedBranchId` null stay unassigned.
- Memberships and payments with `SellingBranchId` null keep their original amounts. Do not backfill those from the member's new home branch.
- Attendance rows with `BranchId` null stay historical. New QR check-ins store the scanned branch.

## Fees in scope

The membership plan price is the charge for a new membership. This application does not store a separate registration fee. `MembershipPlanBranchPrices` holds availability and price for a shared plan. The catalog price is used only while that plan has no branch prices. A sale never substitutes another branch's price, and the server ignores a client-submitted price.

A renewal that extends the same membership row writes a new `MembershipBillingPeriods` row (`FeeType = Renewal`) with the price and selling branch resolved at renewal time. It does not change earlier periods or the original `membership_payments` amounts, discounts, taxes, balances, receipts, or branch. Payments and coupons use the selling branch already stored on that bill. There is no separate payment-branch selector.

Coupon `BranchScope` is `SelectedBranches` or `AllBranches`. All branches means every current and future branch in that coupon's organization. The discount stored on the bill stays the applied amount after later price changes.

## Check-in during the expand phase

If a member has no home branch and the membership has no access scope, QR check-in still follows the previous membership, GPS, expiry, and replay rules. Once a home branch or access scope exists, the scanned branch must be allowed. A denied visit returns `branch_not_allowed`.

## Registration

Member creation, CSV import, and public signup require a home branch. Lead creation requires an interested branch. Conversion copies that interested branch into the new member's home branch and still shows the choice. The server checks that the branch is active, belongs to the same organization, and is allowed for the signed-in operator. Public signup has no operator, so any active branch is allowed and several branches require a choice.

When no eligible branch exists, creation stops with "Create a branch to continue." Authorized users get a Create branch link, keep the unfinished form, and return to that form with the new branch selected. Other people see "Ask an administrator to create a branch." One available branch, or the operator's own authorized home branch, is selected and shown. Saving an existing profile does not fill a blank home or interested branch. `PUT /api/Users/{id}/home-branch` and `PUT /api/Leads/{id}/interested-branch` set those fields only while they are still empty. Changing an existing home branch stays on member transfer.

## Operational ownership

`20261018230000_OperationalBranchOwnership` adds nullable branch columns and transfer tables. It does not assign existing equipment, lockers, stock, sessions, or expenses. Announcement rows that already have a branch are labeled `SelectedBranch`; rows without one stay `OrganizationWide`.

The module-by-module matrix is [BRANCH_MODULE_COVERAGE.md](BRANCH_MODULE_COVERAGE.md). Staff lists, reports, and exports use the signed-in user's authorized branches. Organization-wide administrators are unrestricted. Background jobs have no user, so they stay organization-wide and do not assign a home branch.

`GET /api/branch-operations/unassigned-report` is the administrator checklist. `constraintScriptReady` is true only when every counted column is already filled or explicitly organization-wide. `cannotEstablishReliably` names attendance, sales, memberships, payments, equipment, lockers, PT sessions, and expenses whose branch was never stored. Those rows stay null. Do not copy a home branch, a scan, or the first branch onto them.

`GET /api/branch-operations/metrics` returns three separate numbers: home-branch member count, visited-branch attendance, and selling-branch revenue. A person with access to several branches counts once, at their home branch. Extra assignments are not added again.

`POST /api/branch-operations/assign-missing-home-branches` and `POST /api/branch-operations/assign-missing-interested-branches` set a branch only while the field is still empty. The body is `{ ids, branchId }`. An administrator chooses the branch. Rows that already have a branch are skipped. The calls do not change payments, attendance, stock, or assets.

`src/GymManagement.Infrastructure/Migrations/BranchConstraintEnforcement.later.sql` is the final NOT NULL stage. Startup migration does not run it. Run it only after `constraintScriptReady` is true and an administrator has approved the mapping. If historical attendance or sales remain null, leave those columns nullable. The script is comments plus the column list; it does not contain a backfill.

Before a branch is deactivated, call `GET /api/branches/{id}/deactivation-preview`. The preview counts occupying memberships, people whose home branch is this gym, staff, occupied lockers, equipment, stock, open bookings, and unpaid bills. If any count is above zero, deactivation requires a handling note. `POST /api/branches/{id}/close` stores that note and deactivates the branch. Members, assets, stock, attendance, and bills stay where they are.

Member entry is Home only, Selected branches, or All branches in the organization (`PUT /api/UserMemberships/{id}/visit-access`). QR and manual check-in both use that scope and store the visited branch. A transfer changes the home branch only. `AccessDecision` must be sent to change visit access. `FinancialDecision` must be Unchanged; the transfer does not reprice or move balances.

Equipment moves: `POST /api/branch-operations/equipment-transfers`. Stock moves: `POST /api/branch-operations/stock-transfers`. PT branch price: `PUT /api/branch-operations/pt-package-prices`.

## Backup, compatibility, validation, and recovery

1. Take a full database backup and confirm it restores to a scratch server before deploying the API.
2. Deploy the API first. Startup applies only the expand migrations. Old web and mobile clients keep working because new fields are optional.
3. Deploy the web client, then the mobile app. A new client against an old API will fail branch calls; deploy the API before the clients.
4. Validate with an administrator: `GET /api/branch-operations/unassigned-report`, `GET /api/branch-operations/metrics`, a restricted staff login that cannot read another branch's members, payments, attendance, or POS totals, and a bulk assign of a known empty user that leaves an already-assigned user unchanged.
5. Do not run `BranchConstraintEnforcement.later.sql` in this deployment.
6. Recovery is the backup from step 1. `Down` drops the new columns and tables and deletes branch links created after the migration. Do not run `Down` on a database that already has assignments you need to keep.

## Status

| Stage | This repository |
| --- | --- |
| Implemented | Branch columns, rules, APIs, and the screens listed in the coverage matrix |
| Tested | Pure branch-rule unit tests in `tests/GymManagement.Core.Tests`. API and browser isolation were not executed against a database in this pass |
| Migrated | Not on UAT or production. Expand migrations stay unapplied until an authorized deployment |
| Deployed | No |
