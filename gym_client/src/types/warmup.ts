export interface Warmup {
  id: number
  name: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds: number
  difficultyLevel?: string | null
  bodyPart?: string | null
  caloriesBurn?: number | null
  isActive: boolean
}

export interface CreateWarmupDto {
  name: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds: number
  difficultyLevel?: string | null
  bodyPart?: string | null
  caloriesBurn?: number | null
  isActive?: boolean
}

export interface UpdateWarmupDto {
  name?: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds?: number
  difficultyLevel?: string | null
  bodyPart?: string | null
  caloriesBurn?: number | null
  isActive?: boolean
}

export interface PagedWarmups {
  items: Warmup[]
  totalCount: number
  page: number
  pageSize: number
}

export interface WorkoutPlanWarmup {
  id: number
  warmupId: number
  name: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds: number
  difficultyLevel?: string | null
  bodyPart?: string | null
  caloriesBurn?: number | null
  displayOrder: number
}

export interface PlanWarmupWriteDto {
  warmupId: number
  displayOrder: number
}
