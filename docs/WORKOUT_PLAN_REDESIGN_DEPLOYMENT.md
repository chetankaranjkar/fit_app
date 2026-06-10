# Workout Plan Redesign — Deployment Notes

## Prerequisites

- .NET 9 API
- SQL Server with EF migrations applied
- React client (`gym_client`) rebuilt
- Flutter mobile app rebuilt for template session fields (backward compatible)

## Database

```bash
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API
```

Or run migration SQL from `src/GymManagement.Infrastructure/Migrations/20260610160000_AddWorkoutPlanTemplateSystem.cs`.

Optional seed (categories/warmups/stretches if not already present):

```bash
sqlcmd -S <server> -d <database> -i docs/sql/workout-plan-template-seed.sql
```

## Verification checklist

1. Existing plans show `TemplateMode = LEGACY` in DB; mobile sessions unchanged.
2. Create 90-day SIMPLE plan via wizard — exactly **1** row in `WorkoutPlanWeeks`.
3. Create ADVANCED 4-week template — **4** week rows max.
4. Assign plan to member; `GET /api/me/workout-plans/{id}/session` returns `currentProgramWeek`, warmups, stretches.
5. Clone plan copies structure and template fields.
6. Run `dotnet test tests/GymManagement.Core.Tests --filter WorkoutPlanEngineTests`.

## Rollback

- New columns are nullable/defaulted; rollback is safe if wizard/engine code is reverted.
- Do **not** delete `WorkoutPlanVersions` data if rollback — table is additive.
- LEGACY plans never depended on new columns.

## Feature flags

No separate flag required: `TemplateMode` on each plan controls behavior. New plans default to `SIMPLE` on create; existing rows remain `LEGACY` via migration.
