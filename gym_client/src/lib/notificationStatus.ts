import type { ChannelReadiness } from '../types/notificationChannels'

export function deriveChannelReadiness(
  readiness: string | undefined,
  enabled: boolean,
  isConfigured: boolean,
): ChannelReadiness {
  const r = (readiness ?? '').trim()
  if (r === 'Disabled' || r === 'Unconfigured' || r === 'Ready') return r
  if (!enabled) return 'Disabled'
  if (!isConfigured) return 'Unconfigured'
  return 'Ready'
}
