import { api } from '../lib/api'
import type {
  NotificationHistoryItem,
  NotificationTemplate,
  NotificationTemplatePreview,
  NotificationTemplateQuery,
  UpdateNotificationTemplate,
} from '../types/notificationTemplate'

export const notificationTemplatesService = {
  list: (params: NotificationTemplateQuery) =>
    api.get<{ items: NotificationTemplate[]; total: number; page: number; pageSize: number }>(
      '/notification-templates',
      { params },
    ),
  get: (id: number) => api.get<NotificationTemplate>(`/notification-templates/${id}`),
  update: (id: number, body: UpdateNotificationTemplate) =>
    api.put<NotificationTemplate>(`/notification-templates/${id}`, body),
  reset: (id: number) => api.post<NotificationTemplate>(`/notification-templates/${id}/reset`),
  preview: (id: number) =>
    api.get<NotificationTemplatePreview>(`/notification-templates/${id}/preview`),
  placeholders: () => api.get<Record<string, string>>('/notification-templates/placeholders'),
  testSend: (id: number, recipient: string) =>
    api.post(`/notification-templates/${id}/test-send`, { recipient }),
  history: (params?: { memberId?: number; take?: number }) =>
    api.get<NotificationHistoryItem[]>('/notification-templates/history', { params }),
}
