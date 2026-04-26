export interface ExerciseRecord {
  id: string
  name: string
  slug: string | null
  category: string | null
  muscleGroupPrimary: string | null
  difficulty: string | null
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

export interface ExerciseListQuery {
  page: number
  pageSize: number
  search?: string
  category?: string
  difficulty?: string
  equipment?: string
}

export interface UpsertExerciseInput {
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
