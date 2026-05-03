export interface WorkoutListQuery {
  page: number
  pageSize: number
  search?: string
}

export interface WorkoutExerciseInput {
  exerciseId: string
  workoutDayId?: string | null
  orderIndex: number
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  restTime?: number
  notes?: string
  supersetGroup?: string
}

export interface WorkoutDayInput {
  id?: string
  dayName: string
  orderIndex: number
}

export interface UpsertWorkoutInput {
  name: string
  description?: string
  goal?: string
  difficulty?: string
  duration?: number
  isTemplate?: boolean
  days?: WorkoutDayInput[]
}

export interface UpdateWorkoutExerciseInput {
  workoutDayId?: string | null
  orderIndex?: number
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  restTime?: number
  notes?: string
  supersetGroup?: string
}
