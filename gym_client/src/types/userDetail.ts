export interface UserDetailDto {
  id: number
  userId: number
  height: number
  weight: number
  bmr: number
  bmi: number
  bodyFatPercentage?: number | null
  muscleMass?: number | null
  targetWeight?: number | null
  goalType?: string | null
  activityLevel?: string | null
  measurementDate: string
  notes?: string | null
}

export interface CreateUserDetailDto {
  userId: number
  height: number
  weight: number
  bodyFatPercentage?: number | null
  muscleMass?: number | null
  targetWeight?: number | null
  goalType?: string | null
  activityLevel?: string | null
  notes?: string | null
}
