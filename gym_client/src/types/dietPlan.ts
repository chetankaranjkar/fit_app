export interface DietMealItemDto {
  id: number
  dietMealId: number
  foodName: string
  quantity: string
  calories?: number | null
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatsGrams?: number | null
}

export interface CreateDietMealItemDto {
  dietMealId: number
  foodName: string
  quantity: string
  calories?: number | null
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatsGrams?: number | null
}

export interface UpdateDietMealItemDto {
  foodName?: string | null
  quantity?: string | null
  calories?: number | null
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatsGrams?: number | null
}

export interface DietMealDto {
  id: number
  dietPlanId: number
  mealName: string
  mealOrder: number
  dietMealItems: DietMealItemDto[]
}

export interface CreateDietMealDto {
  dietPlanId: number
  mealName: string
  mealOrder: number
}

export interface UpdateDietMealDto {
  mealName?: string | null
  mealOrder?: number | null
}

export interface DietPlanDto {
  id: number
  planName: string
  goalType: string
  calories: number
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatsGrams?: number | null
  description?: string | null
  isActive: boolean
  dietMeals: DietMealDto[]
}

export interface CreateDietPlanDto {
  planName: string
  goalType: string
  calories: number
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatsGrams?: number | null
  description?: string | null
  isActive?: boolean
}

export interface UpdateDietPlanDto {
  planName?: string | null
  goalType?: string | null
  calories?: number | null
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatsGrams?: number | null
  description?: string | null
  isActive?: boolean | null
}

export interface UserDietPlanDto {
  id: number
  userId: number
  dietPlanId: number
  userName?: string | null
  dietPlanName?: string | null
  assignedByTrainerId?: number | null
  startDate: string
  endDate?: string | null
  isActive: boolean
  notes?: string | null
}

export interface CreateUserDietPlanDto {
  userId: number
  dietPlanId: number
  assignedByTrainerId?: number | null
  startDate: string
  endDate?: string | null
  isActive?: boolean
  notes?: string | null
}
