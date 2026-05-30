import { api } from '../../../lib/api'
import type { HealthProfile, HealthProfileSummary, UpsertHealthProfilePayload } from './types/healthProfile'

const base = '/HealthProfile'

export const healthProfileService = {
  getByUserId(userId: number) {
    return api.get<HealthProfile>(`${base}/user/${userId}`)
  },

  getSummaryByUserId(userId: number) {
    return api.get<HealthProfileSummary>(`${base}/user/${userId}/summary`)
  },

  getMine() {
    return api.get<HealthProfile>(`${base}/me`)
  },

  upsertForUser(userId: number, payload: UpsertHealthProfilePayload) {
    return api.put<HealthProfile>(`${base}/user/${userId}`, payload)
  },

  upsertMine(payload: UpsertHealthProfilePayload) {
    return api.put<HealthProfile>(`${base}/me`, payload)
  },
}
