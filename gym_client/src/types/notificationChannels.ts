export type ChannelReadiness = 'Disabled' | 'Unconfigured' | 'Ready'

export type NotificationChannelKey = 'email' | 'sms' | 'whatsapp' | 'inapp' | 'push'

export type NotificationChannelStatus = {
  channel: NotificationChannelKey | string
  label: string
  readiness: ChannelReadiness | string
  blockingReasons: string[]
  summary: string
  settingsPath: string | null
  secretConfigured: boolean
}

export type NotificationChannelsOverview = {
  channels: NotificationChannelStatus[]
  memberOptInNote: string
}

export type DeliveryDisplayStatus = 'Queued' | 'Retrying' | 'Sent' | 'Failed' | 'Skipped' | string

export type NotificationOutboxItem = {
  id: number
  templateCode: string
  channel: string
  recipient: string
  subject?: string | null
  status: string
  displayStatus: DeliveryDisplayStatus
  retryCount: number
  maxRetries: number
  scheduledForUtc?: string | null
  processedAtUtc?: string | null
  errorMessage?: string | null
  createdDate: string
}
