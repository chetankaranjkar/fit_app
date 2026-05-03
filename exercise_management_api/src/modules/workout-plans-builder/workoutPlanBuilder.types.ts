export interface CreateWorkoutPlanInput {
  name: string
  goal?: string
  duration?: number
  difficulty?: string
}

export interface AddWorkoutPlanDayInput {
  dayNumber: number
  name: string
  isRestDay?: boolean
  orderIndex: number
}

export interface UpdateWorkoutPlanDayInput {
  name?: string
  isRestDay?: boolean
  orderIndex?: number
}

export interface AddWorkoutDayExerciseInput {
  exerciseId: number
  orderIndex: number
  sets?: number
  reps?: number
  restTime?: number
}

export interface UpdateWorkoutExerciseInput {
  orderIndex?: number
  sets?: number
  reps?: number
  restTime?: number
}
