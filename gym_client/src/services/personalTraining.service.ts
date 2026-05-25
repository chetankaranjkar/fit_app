import { api } from '../lib/api'
import type {
  MemberPTPackage,
  PTNotification,
  PTPackage,
  PTSession,
  PagedResult,
  TrainerEarningsDashboard,
  TrainerSchedule,
} from '../types/personalTraining';

export const ptPackagesService = {
  search: (params?: Record<string, unknown>) =>
    api.get<PagedResult<PTPackage>>('/pt/packages', { params }),
  getById: (id: number) => api.get<PTPackage>(`/pt/packages/${id}`),
  create: (body: unknown) => api.post<PTPackage>('/pt/packages', body),
  update: (id: number, body: unknown) => api.put<PTPackage>(`/pt/packages/${id}`, body),
  remove: (id: number) => api.delete(`/pt/packages/${id}`),
};

export const memberPtPackagesService = {
  search: (params?: Record<string, unknown>) =>
    api.get<PagedResult<MemberPTPackage>>('/pt/member-packages', { params }),
  assign: (body: unknown) => api.post<MemberPTPackage>('/pt/member-packages/assign', body),
  recordPayment: (id: number, amount: number) =>
    api.post<MemberPTPackage>(`/pt/member-packages/${id}/payment`, { amount }),
  freeze: (id: number, body: unknown) =>
    api.post<MemberPTPackage>(`/pt/member-packages/${id}/freeze`, body),
  unfreeze: (id: number) => api.post<MemberPTPackage>(`/pt/member-packages/${id}/unfreeze`),
  extend: (id: number, body: unknown) =>
    api.post<MemberPTPackage>(`/pt/member-packages/${id}/extend`, body),
};

export const ptSessionsService = {
  search: (params?: Record<string, unknown>) =>
    api.get<PagedResult<PTSession>>('/pt/sessions', { params }),
  book: (body: unknown) => api.post<PTSession>('/pt/sessions/book', body),
  reschedule: (id: number, body: unknown) =>
    api.post<PTSession>(`/pt/sessions/${id}/reschedule`, body),
  cancel: (id: number, notes?: string) =>
    api.post<PTSession>(`/pt/sessions/${id}/cancel`, notes ?? null),
  markAttendance: (id: number, body: unknown) =>
    api.post(`/pt/sessions/${id}/attendance`, body),
};

export const ptSchedulesService = {
  getByTrainer: (trainerId: number) =>
    api.get<TrainerSchedule[]>(`/pt/schedules/trainer/${trainerId}`),
  upsert: (body: unknown) => api.post<TrainerSchedule>('/pt/schedules', body),
  checkAvailability: (params: Record<string, unknown>) =>
    api.get<boolean>('/pt/schedules/availability', { params }),
  getLeaves: (trainerId: number) => api.get(`/pt/schedules/trainer/${trainerId}/leaves`),
  createLeave: (body: unknown) => api.post('/pt/schedules/leaves', body),
};

export const ptDashboardService = {
  trainer: (trainerId: number) =>
    api.get<TrainerEarningsDashboard>(`/pt/dashboard/trainer/${trainerId}`),
  adminSummary: () => api.get('/pt/dashboard/admin-summary'),
};

export const ptReportsService = {
  revenue: (params?: Record<string, unknown>) => api.get('/pt/reports/revenue', { params }),
  utilization: (params?: Record<string, unknown>) => api.get('/pt/reports/utilization', { params }),
  expiredPackages: (params?: Record<string, unknown>) =>
    api.get('/pt/reports/expired-packages', { params }),
  exportRevenueCsv: (params?: Record<string, unknown>) =>
    api.get('/pt/reports/revenue/export/csv', { params, responseType: 'blob' }),
};

export const ptNotificationsService = {
  list: (params?: Record<string, unknown>) =>
    api.get<PTNotification[]>('/pt/notifications', { params }),
  markRead: (id: number) => api.post(`/pt/notifications/${id}/read`),
};
