import { api } from '../lib/api'
import type {
  BodyMetricsDto,
  BodyMetricsLogDto,
  CreateBodyMetricsDto,
  UpdateBodyMetricsDto,
} from '../types/bodyMetrics'

export const bodyMetricsService = {
  getByUserId: (userId: number) => api.get<BodyMetricsDto[]>(`/BodyMetrics/user/${userId}/logs`),
  getLatestByUser: (userId: number) => api.get<BodyMetricsDto>(`/BodyMetrics/user/${userId}/latest`),
  getCurrentByUser: (userId: number) => api.get<BodyMetricsDto>(`/BodyMetrics/user/${userId}/current`),
  getLogsByUser: (userId: number) => api.get<BodyMetricsLogDto[]>(`/BodyMetrics/user/${userId}/logs`),
  getById: (id: number) => api.get<BodyMetricsDto>(`/BodyMetrics/${id}`),
  create: (data: CreateBodyMetricsDto) => api.post<BodyMetricsDto>('/BodyMetrics/logs', data),
  update: (id: number, data: UpdateBodyMetricsDto) => api.put<BodyMetricsDto>(`/BodyMetrics/logs/${id}`, data),
  delete: (id: number) => api.delete(`/BodyMetrics/logs/${id}`),
}
