import type { SaveProgramStructureDto } from '../../types/workoutPlan'
import { DAY_LABELS, type WizardBasicInfo, type WizardDayDraft, type WizardPlanSummary, type WizardWeekDraft } from './types'

export function emptyDay(dayNumber: number): WizardDayDraft {
  const label = DAY_LABELS[dayNumber - 1] ?? `Day ${dayNumber}`
  return {
    dayNumber,
    name: label,
    focusArea: '',
    isRestDay: false,
    orderIndex: dayNumber,
    exercises: [],
    warmups: [],
    stretches: [],
  }
}

export function buildTemplateWeeks(mode: WizardBasicInfo['templateMode'], count: number): WizardWeekDraft[] {
  const weekCount = mode === 'SIMPLE' ? 1 : Math.min(4, Math.max(2, count))
  const labels = ['A', 'B', 'C', 'D']
  return Array.from({ length: weekCount }, (_, i) => ({
    weekNumber: i + 1,
    name: mode === 'ADVANCED' ? `Week ${labels[i]}` : 'Week Template',
    days: Array.from({ length: 7 }, (_, d) => emptyDay(d + 1)),
  }))
}

export function computeSummary(basic: WizardBasicInfo, weeks: WizardWeekDraft[]): WizardPlanSummary {
  let exercises = 0
  let warmups = 0
  let stretches = 0
  let minutes = 0

  for (const week of weeks) {
    for (const day of week.days) {
      if (day.isRestDay) continue
      exercises += day.exercises.length
      warmups += day.warmups.length
      stretches += day.stretches.length
      if (day.durationMinutes) {
        minutes += day.durationMinutes
      } else {
        minutes += day.exercises.reduce(
          (s, e) => s + Math.max(1, e.sets) * (1 + Math.round(e.restBetweenSets / 60)),
          0,
        )
        minutes += day.warmups.length * 2 + day.stretches.length * 2
      }
    }
  }

  const totalWeeks =
    basic.templateMode === 'LEGACY'
      ? Math.ceil(basic.durationDays / 7)
      : Math.ceil(basic.durationDays / 7)

  return {
    totalWeeks,
    totalExercises: exercises,
    totalWarmups: warmups,
    totalStretches: stretches,
    estimatedMinutes: Math.max(minutes, basic.workoutsPerWeek * 30),
  }
}

export function toStructurePayload(basic: WizardBasicInfo, weeks: WizardWeekDraft[]): SaveProgramStructureDto {
  return {
    templateMode: basic.templateMode,
    templateWeekCount: basic.templateMode === 'SIMPLE' ? 1 : weeks.length,
    repeatTemplate: true,
    workoutCategoryId: basic.workoutCategoryId > 0 ? basic.workoutCategoryId : null,
    useDefaultWarmups: basic.useDefaultWarmups,
    useDefaultStretches: basic.useDefaultStretches,
    weeks: weeks.map((w) => ({
      weekNumber: w.weekNumber,
      name: w.name,
      days: w.days.map((d) => ({
        dayNumber: d.dayNumber,
        name: d.name,
        focusArea: d.focusArea || null,
        durationMinutes: d.durationMinutes ?? null,
        isRestDay: d.isRestDay || d.focusArea === 'Rest Day',
        orderIndex: d.orderIndex,
        exercises: d.exercises.map((e, idx) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          restBetweenSets: e.restBetweenSets,
          order: idx + 1,
          weight: e.weight,
          tempo: e.tempo,
          intensity: e.intensity,
          notes: e.notes,
        })),
        warmups: d.warmups,
        stretches: d.stretches,
      })),
    })),
  }
}
