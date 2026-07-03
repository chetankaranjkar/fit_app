import { api } from '../lib/api'
import type { GymBranding, UpdateGymBranding } from '../types/gymBranding'

function normalize(raw: Record<string, unknown>): GymBranding {
  return {
    gymName: String(raw.gymName ?? raw.GymName ?? 'Gym Management'),
    gymLogoUrl: (raw.gymLogoUrl ?? raw.GymLogoUrl ?? null) as string | null,
    invoiceLogoUrl: (raw.invoiceLogoUrl ?? raw.InvoiceLogoUrl ?? null) as string | null,
  }
}

export const gymBrandingService = {
  get: async () => {
    const { data } = await api.get<Record<string, unknown>>('/GymBranding')
    return normalize(data)
  },

  update: async (payload: UpdateGymBranding) => {
    const { data } = await api.put<Record<string, unknown>>('/GymBranding', payload)
    return normalize(data)
  },

  uploadInvoiceLogo: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<Record<string, unknown>>('/GymBranding/invoice-logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return normalize(data)
  },
}
