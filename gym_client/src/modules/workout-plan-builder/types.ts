export interface BuilderPlanInput {
  name: string
  goal: string
  duration: number
  difficulty: string
}

export interface BuilderDay {
  id: number
  dayNumber: number
  name: string
  isRestDay: boolean
  orderIndex: number
}

export interface BuilderExercise {
  id: number
  clientKey: string
  exerciseId: number
  name: string
  sets: number
  reps: number
  restTime: number
  orderIndex: number
  dayId: number
}

export interface WorkoutPlanBuilderResponse {
  id: number
  name: string
  goal?: string | null
  duration?: number | null
  difficulty?: string | null
  days: BuilderDay[]
  exercises: Array<{
    id: number
    workoutPlanDayId: number
    exerciseId: number
    exerciseName: string
    sets?: number
    reps?: number
    restTime?: number
    orderIndex: number
  }>
}
