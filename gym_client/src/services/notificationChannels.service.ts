import { api } from '../lib/api'
import type { NotificationChannelsOverview } from '../types/notificationChannels'

function normalize(raw: Record<string, unknown>): NotificationChannelsOverview {
  const channelsRaw = (raw.channels ?? raw.Channels ?? []) as Record<string, unknown>[]
  return {
    memberOptInNote: String(
      raw.memberOptInNote ??
        raw.MemberOptInNote ??
        'Outbound email and SMS/WhatsApp send only when the member has opted in.',
    ),
    channels: channelsRaw.map((c) => ({
      channel: String(c.channel ?? c.Channel ?? ''),
      label: String(c.label ?? c.Label ?? ''),
      readiness: String(c.readiness ?? c.Readiness ?? 'Unconfigured'),
      blockingReasons: ((c.blockingReasons ?? c.BlockingReasons ?? []) as unknown[]).map(String),
      summary: String(c.summary ?? c.Summary ?? ''),
      settingsPath: (c.settingsPath ?? c.SettingsPath ?? null) as string | null,
      secretConfigured: Boolean(c.secretConfigured ?? c.SecretConfigured),
    })),
  }
}

export const notificationChannelsService = {
  getOverview: async () => {
    const { data } = await api.get<Record<string, unknown>>('/notification-channels')
    return normalize(data)
  },
}
