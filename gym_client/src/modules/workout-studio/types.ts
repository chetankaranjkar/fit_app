export interface ExerciseLibraryItem {
  id: string
  name: string
  category?: string | null
  muscleGroupPrimary?: string | null
  difficulty?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
}

export interface WorkoutDay {
  id: string
  dayName: string
  orderIndex: number
}

export interface WorkoutCanvasExercise extends ExerciseLibraryItem {
  clientKey: string
  workoutExerciseId?: string
  workoutDayId?: string | null
  orderIndex: number
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  restTime?: number
  notes?: string
  supersetGroup?: string
  isExpanded?: boolean
}

export interface Workout {
  id: string
  name: string
  description?: string | null
  goal?: string | null
  difficulty?: string | null
  duration?: number | null
  days: WorkoutDay[]
  exercises: WorkoutCanvasExercise[]
}

export interface GenerateAiWorkoutInput {
  goal: string
  experience: string
  days: number
  duration: number
  equipment: string[]
  injuries?: string
}

export interface AiWorkoutDay {
  day: string
  focus?: string
  exercises: Array<{
    name: string
    sets: number
    reps: string
    rest: string
  }>
}

export interface AiWorkoutResult {
  source: 'openai' | 'fallback'
  explanation?: string
  plan: AiWorkoutDay[]
}
