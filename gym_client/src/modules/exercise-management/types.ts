export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export interface Exercise {
  id: string
  name: string
  slug: string | null
  category: string | null
  muscleGroupPrimary: string | null
  difficulty: Difficulty | string | null
  description: string | null
  createdAt: string
  updatedAt: string | null
  forceType: string | null
  mechanic: string | null
  equipment: string | null
  isUnilateral: boolean
  isTimeBased: boolean
  imageUrl: string | null
  videoUrl: string | null
}

export interface ExerciseFilters {
  search: string
  category: string
  difficulty: string
  equipment: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface ExerciseListResponse {
  items: Exercise[]
  pagination: PaginationMeta
}

export interface ExerciseUpsertPayload {
  name: string
  category?: string
  muscleGroupPrimary?: string
  difficulty?: string
  description?: string
  forceType?: string
  mechanic?: string
  equipment?: string[]
  isUnilateral?: boolean
  isTimeBased?: boolean
  imageUrl?: string
  videoUrl?: string
}
