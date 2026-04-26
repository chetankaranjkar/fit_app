import { api } from '../lib/api'
import type {
  DietPlanDto,
  DietMealDto,
  DietMealItemDto,
  CreateDietPlanDto,
  UpdateDietPlanDto,
  CreateDietMealDto,
  UpdateDietMealDto,
  CreateDietMealItemDto,
  UpdateDietMealItemDto,
} from '../types/dietPlan'

export const dietPlansService = {
  // Plans
  getAll: () => api.get<DietPlanDto[]>('/DietPlans'),
  getById: (id: number) => api.get<DietPlanDto>(`/DietPlans/${id}`),
  create: (data: CreateDietPlanDto) => api.post<DietPlanDto>('/DietPlans', data),
  update: (id: number, data: UpdateDietPlanDto) =>
    api.put<DietPlanDto>(`/DietPlans/${id}`, data),
  delete: (id: number) => api.delete(`/DietPlans/${id}`),

  // Meals
  createMeal: (data: CreateDietMealDto) =>
    api.post<DietMealDto>('/DietPlans/meals', data),
  updateMeal: (id: number, data: UpdateDietMealDto) =>
    api.put<DietMealDto>(`/DietPlans/meals/${id}`, data),
  deleteMeal: (id: number) => api.delete(`/DietPlans/meals/${id}`),

  // Meal items
  createMealItem: (data: CreateDietMealItemDto) =>
    api.post<DietMealItemDto>('/DietPlans/meal-items', data),
  updateMealItem: (id: number, data: UpdateDietMealItemDto) =>
    api.put<DietMealItemDto>(`/DietPlans/meal-items/${id}`, data),
  deleteMealItem: (id: number) => api.delete(`/DietPlans/meal-items/${id}`),
}
