export interface BodyMetricsDto {
  id: number
  userId: number
  userName: string
  measurementDate: string
  weightKg: number
  bodyFatPct?: number | null
  muscleMassKg?: number | null
  chestCm?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  bicepsCm?: number | null
  thighsCm?: number | null
  neckCm?: number | null
  shouldersCm?: number | null
  forearmsCm?: number | null
  calvesCm?: number | null
  heightCm?: number | null
  notes?: string | null
  progressPictureUrl?: string | null
}

export interface BodyMetricsLogDto {
  id: number
  bodyMetricsId: number
  userId: number
  userName: string
  measurementDate: string
  createdDate: string
  weightKg: number
  bodyFatPct?: number | null
  muscleMassKg?: number | null
  chestCm?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  bicepsCm?: number | null
  thighsCm?: number | null
  neckCm?: number | null
  shouldersCm?: number | null
  forearmsCm?: number | null
  calvesCm?: number | null
  heightCm?: number | null
  notes?: string | null
  progressPictureUrl?: string | null
}

export interface CreateBodyMetricsDto {
  userId: number
  measurementDate?: string | null
  weightKg: number
  bodyFatPct?: number | null
  muscleMassKg?: number | null
  chestCm?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  bicepsCm?: number | null
  thighsCm?: number | null
  neckCm?: number | null
  shouldersCm?: number | null
  forearmsCm?: number | null
  calvesCm?: number | null
  heightCm?: number | null
  notes?: string | null
  progressPictureUrl?: string | null
}

export interface UpdateBodyMetricsDto {
  measurementDate?: string | null
  weightKg?: number | null
  bodyFatPct?: number | null
  muscleMassKg?: number | null
  chestCm?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  bicepsCm?: number | null
  thighsCm?: number | null
  neckCm?: number | null
  shouldersCm?: number | null
  forearmsCm?: number | null
  calvesCm?: number | null
  heightCm?: number | null
  notes?: string | null
  progressPictureUrl?: string | null
}
