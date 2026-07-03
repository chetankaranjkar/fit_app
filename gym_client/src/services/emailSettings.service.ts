import { api } from '../lib/api'
import type { EmailSettings, UpdateEmailSettings } from '../types/emailSettings'

function normalize(raw: Record<string, unknown>): EmailSettings {
  return {
    enabled: Boolean(raw.enabled ?? raw.Enabled),
    provider: String(raw.provider ?? raw.Provider ?? 'custom'),
    smtpHost: (raw.smtpHost ?? raw.SmtpHost ?? null) as string | null,
    smtpPort: Number(raw.smtpPort ?? raw.SmtpPort ?? 587),
    smtpUseStartTls: raw.smtpUseStartTls ?? raw.SmtpUseStartTls ?? true,
    smtpUsername: (raw.smtpUsername ?? raw.SmtpUsername ?? null) as string | null,
    hasPasswordConfigured: Boolean(raw.hasPasswordConfigured ?? raw.HasPasswordConfigured),
    fromAddress: (raw.fromAddress ?? raw.FromAddress ?? null) as string | null,
    fromDisplayName: (raw.fromDisplayName ?? raw.FromDisplayName ?? null) as string | null,
    sendPaymentReceipts: raw.sendPaymentReceipts ?? raw.SendPaymentReceipts ?? true,
    sendMembershipExpiryReminders:
      raw.sendMembershipExpiryReminders ?? raw.SendMembershipExpiryReminders ?? true,
    sendDietAssignments: raw.sendDietAssignments ?? raw.SendDietAssignments ?? true,
    isConfigured: Boolean(raw.isConfigured ?? raw.IsConfigured),
    passwordNeedsReentry: Boolean(raw.passwordNeedsReentry ?? raw.PasswordNeedsReentry),
    updatedDateUtc: (raw.updatedDateUtc ?? raw.UpdatedDateUtc ?? null) as string | null,
  }
}

export const emailSettingsService = {
  get: async () => {
    const { data } = await api.get<Record<string, unknown>>('/EmailSettings')
    return normalize(data)
  },

  update: async (payload: UpdateEmailSettings) => {
    const { data } = await api.put<Record<string, unknown>>('/EmailSettings', payload)
    return normalize(data)
  },

  sendTest: async (toAddress: string) => {
    const { data } = await api.post<{ message?: string }>('/EmailSettings/test', { toAddress })
    return data
  },
}
