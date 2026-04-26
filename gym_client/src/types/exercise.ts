export interface ExerciseStep {
  id: number
  stepNumber: number
  description: string
  imageUrl?: string | null
}

export interface Exercise {
  id: number
  name: string
  description?: string | null
  steps: string
  videoUrl?: string | null
  difficultyLevel: string
  equipmentRequired?: string | null
  bodyPartId: number
  bodyPartName: string
  exerciseSteps: ExerciseStep[]
}

export interface CreateExerciseStepDto {
  stepNumber: number
  description: string
  imageUrl?: string | null
}

export interface CreateExerciseDto {
  name: string
  description?: string | null
  steps: string
  videoUrl?: string | null
  difficultyLevel: string
  equipmentRequired?: string | null
  bodyPartId: number
  exerciseSteps: CreateExerciseStepDto[]
}

export interface UpdateExerciseDto {
  name?: string
  description?: string | null
  steps?: string
  videoUrl?: string | null
  difficultyLevel?: string
  equipmentRequired?: string | null
  bodyPartId?: number
  exerciseSteps?: CreateExerciseStepDto[]
}

export interface PagedExercisesResponse {
  items: Exercise[]
  totalCount: number
  page: number
  pageSize: number
}
