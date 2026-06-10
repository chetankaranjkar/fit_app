import { api } from '../lib/api'
import type { CreateWarmupDto, PagedWarmups, UpdateWarmupDto, Warmup } from '../types/warmup'

export const warmupsService = {
  getAll: () => api.get<Warmup[]>('/warmups'),
  getPaged: (params: {
    page?: number
    pageSize?: number
    search?: string
    difficulty?: string
    bodyPart?: string
    isActive?: boolean
  }) => api.get<PagedWarmups>('/warmups/paged', { params }),
  getById: (id: number) => api.get<Warmup>(`/warmups/${id}`),
  create: (data: CreateWarmupDto) => api.post<Warmup>('/warmups', data),
  update: (id: number, data: UpdateWarmupDto) => api.put<Warmup>(`/warmups/${id}`, data),
  delete: (id: number) => api.delete(`/warmups/${id}`),
}
