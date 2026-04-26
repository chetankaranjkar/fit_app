export interface BodyPartMuscle {
  id: number
  bodyPartId: number
  name: string
  description?: string | null
  imageUrl?: string | null
}

export interface BodyPart {
  id: number
  name: string
  description?: string | null
  imageUrl?: string | null
  exerciseCount: number
  bodyPartMuscles: BodyPartMuscle[]
  cameraPositionJson?: string | null
}

export interface CreateBodyPartDto {
  name: string
  description?: string | null
  imageUrl?: string | null
}

export interface UpdateBodyPartDto {
  name: string
  description?: string | null
  imageUrl?: string | null
}

export interface CreateBodyPartMuscleDto {
  bodyPartId: number
  name: string
  description?: string | null
  imageUrl?: string | null
}

export interface UpdateBodyPartMuscleDto {
  name: string
  description?: string | null
  imageUrl?: string | null
}
