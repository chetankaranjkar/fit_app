# Workout Plan Redesign — Impact Analysis

**Date:** 2026-06-10

## Current schema

| Table | Role |
|-------|------|
| `WorkoutPlans` | Metadata, `DurationDays`, category + mobility flags (partial) |
| `WorkoutPlanWeeks` | Physical week rows — **pain point** for 180/365-day plans |
| `WorkoutPlanDays` | ISO weekday template (`DayNumber` 1–7) |
| `WorkoutPlanExercises` | Per-day or orphan exercises |
| `WorkoutPlanWarmups` / `WorkoutPlanStretches` | Plan-level mobility (exists) |
| `WorkoutCategories` + junction tables | Category defaults (exists) |

## Current APIs

- `GET/PUT /api/WorkoutPlans` — CRUD + `PUT .../structure`
- `POST /api/WorkoutPlans/{id}/clone` — exists
- `GET /api/me/workout-plans/{id}/session` — weekday filter, plan-level warmups

## Gaps vs requirements (resolved 2026-06-10)

1. ~~No `TemplateMode` / `RepeatTemplate` / `TemplateWeekCount` / `Version`~~ — migration + entities
2. ~~No `WorkoutPlanEngine`~~ — `WorkoutPlanEngine` + `WorkoutPlanScheduleResolver`
3. ~~No per-day warmups/stretches~~ — structure save + day FK
4. ~~No version history table~~ — `WorkoutPlanVersions`
5. ~~No React template wizard~~ — `/dashboard/training/programs/new`
6. ~~Unlimited week duplication~~ — capped at 1 (SIMPLE) or 4 (ADVANCED)

## Backward compatibility

- Migration sets `TemplateMode = LEGACY` for all existing plans
- LEGACY resolution unchanged (weekday → `DayNumber`)
- Plan-level warmups/stretches continue working (`WorkoutPlanDayId` NULL)
- No row migration required

## Risk matrix

| Risk | Mitigation |
|------|------------|
| Mobile API break | Additive DTO fields only |
| Multi-week LEGACY plans | Engine skips template cycling for LEGACY |
| Performance | Store 1–4 template weeks max for SIMPLE/ADVANCED |

See [WORKOUT_PLAN_REDESIGN_TECHNICAL_DESIGN.md](./WORKOUT_PLAN_REDESIGN_TECHNICAL_DESIGN.md) and [WORKOUT_PLAN_REDESIGN_DEPLOYMENT.md](./WORKOUT_PLAN_REDESIGN_DEPLOYMENT.md).
