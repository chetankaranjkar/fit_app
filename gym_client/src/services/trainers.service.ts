import { api } from '../lib/api'
import type { ApiPagedResponse } from '../types/apiPaged'
import type {
  Trainer,
  TrainerStats,
  UpdateTrainerDto,
  CreateTrainerDto,
  TrainerReview,
  CreateTrainerReviewDto,
  TrainerAvailabilitySlot,
  TrainerEarningsSummary,
} from '../types/trainer'

/**
 * Trainer-module API surface. The "extended" endpoints below (reviews,
 * schedule, earnings, clients) match the planned server routes — if the
 * backend hasn't shipped them yet, their queries will simply return an
 * empty array / null and the UI renders an "empty state" panel.
 */
export const trainersService = {
  /* Core CRUD */
  getStats: () => api.get<TrainerStats>('/Trainers/stats'),
  getPaged: (params: {
    page: number
    pageSize: number
    search?: string
    isActive?: boolean
    sortBy?: string
    sortDir?: 'asc' | 'desc'
  }) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.isActive != null) query.set('isActive', String(params.isActive))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortDir) query.set('sortDir', params.sortDir)
    return api.get<ApiPagedResponse<Trainer>>(`/Trainers/paged?${query.toString()}`)
  },
  getAll: () => api.get<Trainer[]>('/Trainers'),
  getById: (id: number) => api.get<Trainer>(`/Trainers/${id}`),
  create: (data: CreateTrainerDto) => api.post<Trainer>('/Trainers', data),
  update: (id: number, data: UpdateTrainerDto) =>
    api.put<Trainer>(`/Trainers/${id}`, data),
  delete: (id: number) => api.delete(`/Trainers/${id}`),

  /* Availability & employment helpers */
  setAvailability: (id: number, status: string) =>
    api.put<Trainer>(`/Trainers/${id}`, { availabilityStatus: status }),
  setActive: (id: number, isActive: boolean) =>
    api.put<Trainer>(`/Trainers/${id}`, { isActive }),

  /* Assigned clients (extended) */
  getAssignedClients: (id: number) =>
    api.get<Array<{
      userId: number
      firstName: string
      lastName: string
      email?: string
      profilePicture?: string | null
      assignedOn?: string | null
      membershipPlan?: string | null
      preferredGymTime?: string | null
      trainingScheduleType?: string | null
      trainingStartTime?: string | null
      trainingEndTime?: string | null
      trainingDaysOfWeek?: string | null
      trainingScheduleLabel?: string | null
    }>>(`/Trainers/${id}/clients`),
  assignClient: (trainerId: number, userId: number) =>
    api.post(`/Trainers/${trainerId}/clients`, { userId }),
  unassignClient: (trainerId: number, userId: number) =>
    api.delete(`/Trainers/${trainerId}/clients/${userId}`),

  /* Reviews (extended) */
  getReviews: (id: number) => api.get<TrainerReview[]>(`/Trainers/${id}/reviews`),
  addReview: (data: CreateTrainerReviewDto) =>
    api.post<TrainerReview>(`/Trainers/${data.trainerId}/reviews`, data),

  /* Schedule (extended) */
  getSchedule: (id: number, from?: string, to?: string) =>
    api.get<TrainerAvailabilitySlot[]>(`/Trainers/${id}/schedule`, {
      params: { from, to },
    }),
  addSlot: (id: number, slot: Omit<TrainerAvailabilitySlot, 'id' | 'trainerId'>) =>
    api.post<TrainerAvailabilitySlot>(`/Trainers/${id}/schedule`, slot),
  removeSlot: (id: number, slotId: number) =>
    api.delete(`/Trainers/${id}/schedule/${slotId}`),

  /* Earnings (extended) */
  getEarnings: (id: number) =>
    api.get<TrainerEarningsSummary>(`/Trainers/${id}/earnings`),
}
