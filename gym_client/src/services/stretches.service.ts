import { api } from '../lib/api'
import type { CreateStretchDto, PagedStretches, Stretch, UpdateStretchDto } from '../types/stretch'

export const stretchesService = {
  getAll: () => api.get<Stretch[]>('/stretches'),
  getPaged: (params: {
    page?: number
    pageSize?: number
    search?: string
    difficulty?: string
    bodyPart?: string
    isActive?: boolean
  }) => api.get<PagedStretches>('/stretches/paged', { params }),
  getById: (id: number) => api.get<Stretch>(`/stretches/${id}`),
  create: (data: CreateStretchDto) => api.post<Stretch>('/stretches', data),
  update: (id: number, data: UpdateStretchDto) => api.put<Stretch>(`/stretches/${id}`, data),
  delete: (id: number) => api.delete(`/stretches/${id}`),
}
