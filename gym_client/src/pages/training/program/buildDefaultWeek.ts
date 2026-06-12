import type { ProgramWeekDto, WorkoutPlanExercise } from '../../../types/workoutPlan'
import { nextTempId } from './tempIds'

export const WEEKDAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

/** ISO weekday numbers (Mon=1 … Sun=7) marked as rest for a given training frequency. */
const REST_DAYS_BY_FREQUENCY: Record<number, ReadonlySet<number>> = {
  3: new Set([2, 4, 6, 7]),
  4: new Set([3, 6, 7]),
  5: new Set([6, 7]),
  6: new Set([7]),
}

function restDaysForFrequency(workoutsPerWeek: number): ReadonlySet<number> {
  const clamped = Math.min(6, Math.max(3, workoutsPerWeek))
  return REST_DAYS_BY_FREQUENCY[clamped] ?? REST_DAYS_BY_FREQUENCY[4]
}

export function buildDefaultWeek(options: {
  workoutsPerWeek?: number
  weekNumber?: number
  weekName?: string | null
  orphanExercises?: WorkoutPlanExercise[]
}): ProgramWeekDto {
  const weekNumber = options.weekNumber ?? 1
  const weekId = nextTempId()
  const restDays = restDaysForFrequency(options.workoutsPerWeek ?? 4)
  const orphans = options.orphanExercises ?? []
  let firstTrainingDayId: number | null = null

  const days = WEEKDAY_LABELS.map((label, index) => {
    const dayNumber = index + 1
    const isRestDay = restDays.has(dayNumber)
    const id = nextTempId()
    if (!isRestDay && firstTrainingDayId === null) firstTrainingDayId = id

    const exercises =
      !isRestDay && id === firstTrainingDayId
        ? orphans.map((e, i) => ({
            id: nextTempId(),
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            videoUrl: e.videoUrl,
            bodyPartName: e.bodyPartName,
            sets: e.sets,
            reps: e.reps,
            restBetweenSets: e.restBetweenSets,
            order: i + 1,
            weight: e.weight ?? null,
            tempo: e.tempo ?? null,
            intensity: e.intensity ?? null,
            notes: e.notes ?? null,
            workoutPlanDayId: id,
          }))
        : []

    return {
      id,
      weekId,
      dayNumber,
      dayName: label,
      focusArea: isRestDay ? null : 'Training',
      durationMinutes: isRestDay ? null : null,
      notes: null,
      isRestDay,
      orderIndex: dayNumber,
      exercises,
    }
  })

  return {
    id: weekId,
    weekNumber,
    name: options.weekName ?? `Week ${weekNumber}`,
    days,
  }
}
