export type WorkoutType = 'Warmup' | 'ShortHIIT' | 'LongHIIT' | 'Strength' | 'Cardio'

export interface WorkoutPlanExercise {
  id: number
  exerciseId: number
  exerciseName: string
  sets: number
  reps: number
  restBetweenSets: number
  order: number
  weight?: number | null
}

export interface WorkoutPlan {
  id: number
  name: string
  description?: string | null
  workoutType: WorkoutType
  duration: number
  difficultyLevel: string
  trainerId?: number | null
  trainerName?: string | null
  isActive: boolean
  createdById?: number | null
  creatorType?: string | null
  creatorName?: string | null
  isPublic: boolean
  exercises: WorkoutPlanExercise[]
}

export interface CreateWorkoutPlanExerciseDto {
  exerciseId: number
  sets: number
  reps: number
  restBetweenSets: number
  order: number
  weight?: number | null
}

export interface CreateWorkoutPlanDto {
  name: string
  description?: string | null
  workoutType: WorkoutType
  duration: number
  difficultyLevel: string
  trainerId?: number | null
  createdById?: number | null
  creatorType?: string | null
  isPublic: boolean
  exercises: CreateWorkoutPlanExerciseDto[]
}
