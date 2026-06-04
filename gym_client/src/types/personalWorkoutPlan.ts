import type { WorkoutType } from './workoutPlan'

export interface CreatePersonalWorkoutPlanDto {
  name: string
  description?: string | null
  workoutType: WorkoutType
  duration?: number
  difficultyLevel?: string
  goal?: string | null
  durationDays?: number
  workoutsPerWeek?: number
}
