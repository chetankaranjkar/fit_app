import type { PlanWarmupWriteDto } from './warmup'

export interface Stretch {
  id: number
  name: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds: number
  difficultyLevel?: string | null
  bodyPart?: string | null
  isActive: boolean
}

export interface CreateStretchDto {
  name: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds: number
  difficultyLevel?: string | null
  bodyPart?: string | null
  isActive?: boolean
}

export interface UpdateStretchDto {
  name?: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds?: number
  difficultyLevel?: string | null
  bodyPart?: string | null
  isActive?: boolean
}

export interface PagedStretches {
  items: Stretch[]
  totalCount: number
  page: number
  pageSize: number
}

export interface WorkoutPlanStretch {
  id: number
  stretchId: number
  name: string
  description?: string | null
  videoUrl?: string | null
  durationSeconds: number
  difficultyLevel?: string | null
  bodyPart?: string | null
  displayOrder: number
}

export interface PlanStretchWriteDto {
  stretchId: number
  displayOrder: number
}

export interface SavePlanWarmupStretchDto {
  warmups: PlanWarmupWriteDto[]
  stretches: PlanStretchWriteDto[]
}
