import { api } from '../lib/api'
import type {
  SmsChannelSettings,
  SmsSettings,
  TextChannel,
  UpdateSmsSettings,
} from '../types/smsSettings'

function normalizeChannel(raw: Record<string, unknown> | undefined | null): SmsChannelSettings {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    enabled: Boolean(r.enabled ?? r.Enabled),
    webhookUrl: (r.webhookUrl ?? r.WebhookUrl ?? null) as string | null,
    senderId: (r.senderId ?? r.SenderId ?? null) as string | null,
    hasAuthHeaderConfigured: Boolean(r.hasAuthHeaderConfigured ?? r.HasAuthHeaderConfigured),
    sendPaymentReceipts: Boolean(r.sendPaymentReceipts ?? r.SendPaymentReceipts ?? true),
    sendMembershipExpiryReminders: Boolean(
      r.sendMembershipExpiryReminders ?? r.SendMembershipExpiryReminders ?? true,
    ),
    isConfigured: Boolean(r.isConfigured ?? r.IsConfigured),
  }
}

function normalize(raw: Record<string, unknown>): SmsSettings {
  return {
    sms: normalizeChannel((raw.sms ?? raw.Sms) as Record<string, unknown>),
    whatsApp: normalizeChannel((raw.whatsApp ?? raw.WhatsApp) as Record<string, unknown>),
    updatedDateUtc: (raw.updatedDateUtc ?? raw.UpdatedDateUtc ?? null) as string | null,
  }
}

export const smsSettingsService = {
  get: async () => {
    const { data } = await api.get<Record<string, unknown>>('/SmsSettings')
    return normalize(data)
  },

  update: async (payload: UpdateSmsSettings) => {
    const { data } = await api.put<Record<string, unknown>>('/SmsSettings', payload)
    return normalize(data)
  },

  sendTest: async (toPhone: string, channel: TextChannel) => {
    const { data } = await api.post<{ message?: string }>('/SmsSettings/test', { toPhone, channel })
    return data
  },
}
