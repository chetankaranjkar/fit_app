import { api } from '../lib/api'

export type OrganizationListDto = {
  id: number
  name: string
  organizationType?: string | null
  isActive: boolean
}

export type OrganizationCreatePayload = {
  name: string
  organizationType?: string | null
}

export const organizationsService = {
  list: () => api.get<OrganizationListDto[]>('/organizations'),

  create: (body: OrganizationCreatePayload) => api.post<OrganizationListDto>('/organizations', body),
}
