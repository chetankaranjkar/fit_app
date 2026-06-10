# Workout Plan Redesign — Technical Design

**Date:** 2026-06-10

## Overview

Trainers build **template weeks only** (1 week for SIMPLE, 2–4 for ADVANCED). The `WorkoutPlanEngine` resolves which template week and ISO weekday apply on any calendar day. Existing plans remain `LEGACY` and use prior weekday logic.

## Template modes

| Mode | Stored weeks | Resolution |
|------|--------------|------------|
| `LEGACY` | As saved historically | ISO weekday → `WorkoutPlanDays.DayNumber` |
| `SIMPLE` | 1 template week | Always week 1, ISO weekday |
| `ADVANCED` | 2–4 template weeks | `(programWeek - 1) % TemplateWeekCount + 1`, ISO weekday |

## WorkoutPlanEngine

Location: `src/GymManagement.Core/Services/WorkoutPlanEngine.cs`

- `CalculateProgramDay` — elapsed days since assignment start, capped at `DurationDays`
- `CalculateProgramWeek` — `((day - 1) / 7) + 1`
- `ResolveTemplateWeekNumber` — cycles template for SIMPLE/ADVANCED; LEGACY uses program week
- `ResolveToday` — picks `WorkoutPlanDay`, exercises, rest flag

## Schedule resolution (API / mobile)

`WorkoutPlanScheduleResolver` (`Infrastructure`) loads plan structure, member assignment start, and delegates to the engine. Used by:

- `GET /api/me/workout-plans/{id}/session`
- `WorkoutTrackingService.LoadPlanExercisesForTodayAsync`

Mobility resolution order: **per-day links** → **category defaults** (if flags set) → **plan-level links**.

## Schema additions

`WorkoutPlans`: `RepeatTemplate`, `TemplateMode`, `TemplateWeekCount`, `Version`

`WorkoutPlanWarmups` / `WorkoutPlanStretches`: nullable `WorkoutPlanDayId`

`WorkoutPlanVersions`: JSON snapshot on structure save

Migration: `20260610160000_AddWorkoutPlanTemplateSystem.cs` — sets existing rows to `LEGACY`.

## API (additive)

Plan DTOs expose `templateMode`, `templateWeekCount`, `repeatTemplate`, `version`.

Session template adds `templateMode`, `currentProgramWeek`, `currentProgramDay`, `templateWeekCount`, `planVersion`.

`PUT /api/Programs/{id}/structure` accepts template fields + per-day warmups/stretches.

## React

- **Wizard:** `/dashboard/training/programs/new` — `gym_client/src/modules/workout-plan-wizard/`
- **Legacy builder:** `/dashboard/training/workout-plan-builder` unchanged

## Flutter

`MeWorkoutSessionTemplate` parses new fields. Execution flow: warmups (`MobilityFlowScreen`) → exercises → stretches → summary (existing routes).

## Versioning & clone

- Structure save increments `Version` and appends `WorkoutPlanVersions`
- `POST /api/Programs/{id}/clone` copies template metadata and structure

## Performance

SIMPLE/ADVANCED saves cap template weeks at 1–4. No materialization of 26/52 `WorkoutPlanWeeks` rows for long plans.

## Tests

`tests/GymManagement.Core.Tests/WorkoutPlanEngineTests.cs` — durations 30–365, SIMPLE/ADVANCED/LEGACY, rest days.
