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
  PagedDietPlansResponse,
  DietPlanStats,
} from '../types/dietPlan'

export const dietPlansService = {
  // Plans
  getAll: () => api.get<DietPlanDto[]>('/DietPlans'),
  getPaged: (params: {
    page: number
    pageSize: number
    search?: string
    goalType?: string
    isActive?: boolean
  }) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.goalType && params.goalType !== 'all') query.set('goalType', params.goalType)
    if (params.isActive != null) query.set('isActive', String(params.isActive))
    return api.get<PagedDietPlansResponse>(`/DietPlans/paged?${query.toString()}`)
  },
  getStats: () => api.get<DietPlanStats>('/DietPlans/stats'),
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
