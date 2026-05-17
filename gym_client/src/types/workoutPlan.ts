export type WorkoutType = 'Warmup' | 'ShortHIIT' | 'LongHIIT' | 'Strength' | 'Cardio'

export type ProgramGoal =
  | 'Muscle Gain'
  | 'Fat Loss'
  | 'Strength'
  | 'Mobility'
  | 'Endurance'
  | 'HIIT'
  | 'Athletic Performance'
  | 'Beginner Fitness'

export interface WorkoutPlanExercise {
  id: number
  exerciseId: number
  exerciseName: string
  videoUrl?: string | null
  bodyPartName?: string | null
  sets: number
  reps: number
  restBetweenSets: number
  order: number
  weight?: number | null
  tempo?: string | null
  intensity?: string | null
  notes?: string | null
  workoutPlanDayId?: number | null
}

export interface ProgramDayDto {
  id: number
  weekId: number
  dayNumber: number
  dayName: string
  focusArea?: string | null
  durationMinutes?: number | null
  notes?: string | null
  isRestDay: boolean
  orderIndex: number
  exercises: WorkoutPlanExercise[]
}

export interface ProgramWeekDto {
  id: number
  weekNumber: number
  name?: string | null
  days: ProgramDayDto[]
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
  goal?: string | null
  durationDays?: number
  workoutsPerWeek?: number
  thumbnail?: string | null
  estimatedCaloriesBurn?: number | null
  tags?: string[]
  status?: string
  assignedMembersCount?: number
  completionRatePercent?: number
  weeks?: ProgramWeekDto[]
  exercises: WorkoutPlanExercise[]
}

export interface CreateWorkoutPlanExerciseDto {
  exerciseId: number
  sets: number
  reps: number
  restBetweenSets: number
  order: number
  weight?: number | null
  tempo?: string | null
  intensity?: string | null
  notes?: string | null
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
  goal?: string | null
  durationDays?: number
  workoutsPerWeek?: number
  thumbnail?: string | null
  estimatedCaloriesBurn?: number | null
  tags?: string[] | null
  status?: string
  exercises: CreateWorkoutPlanExerciseDto[]
}

export interface ProgramExerciseWriteDto {
  exerciseId: number
  sets: number
  reps: number
  restBetweenSets: number
  order: number
  weight?: number | null
  tempo?: string | null
  intensity?: string | null
  notes?: string | null
}

export interface ProgramDayWriteDto {
  dayNumber: number
  name: string
  focusArea?: string | null
  durationMinutes?: number | null
  notes?: string | null
  isRestDay: boolean
  orderIndex: number
  exercises: ProgramExerciseWriteDto[]
}

export interface ProgramWeekWriteDto {
  weekNumber: number
  name?: string | null
  days: ProgramDayWriteDto[]
}

export interface SaveProgramStructureDto {
  weeks: ProgramWeekWriteDto[]
}

export interface CloneWorkoutPlanDto {
  name?: string | null
}
