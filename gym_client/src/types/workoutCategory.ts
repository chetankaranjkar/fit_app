export interface WorkoutCategorySummary {
  id: number
  name: string
  description?: string | null
  isActive: boolean
  warmupCount: number
  stretchCount: number
}

export interface WorkoutCategoryWarmup {
  id: number
  warmupId: number
  name: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds: number
  bodyPart?: string | null
  displayOrder: number
}

export interface WorkoutCategoryStretch {
  id: number
  stretchId: number
  name: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds: number
  bodyPart?: string | null
  displayOrder: number
}

export interface WorkoutCategory {
  id: number
  name: string
  description?: string | null
  isActive: boolean
  warmups: WorkoutCategoryWarmup[]
  stretches: WorkoutCategoryStretch[]
}

export interface CreateWorkoutCategoryDto {
  name: string
  description?: string | null
  isActive?: boolean
}

export interface UpdateWorkoutCategoryDto {
  name?: string
  description?: string | null
  isActive?: boolean
}

export interface CategoryWarmupWriteDto {
  warmupId: number
  displayOrder: number
}

export interface CategoryStretchWriteDto {
  stretchId: number
  displayOrder: number
}

export interface SaveCategoryWarmupStretchDto {
  warmups: CategoryWarmupWriteDto[]
  stretches: CategoryStretchWriteDto[]
}
