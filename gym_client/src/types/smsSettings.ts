export type TextChannel = 'sms' | 'whatsapp'

export type SmsChannelSettings = {
  enabled: boolean
  webhookUrl: string | null
  senderId: string | null
  hasAuthHeaderConfigured: boolean
  sendPaymentReceipts: boolean
  sendMembershipExpiryReminders: boolean
  isConfigured: boolean
}

export type SmsSettings = {
  sms: SmsChannelSettings
  whatsApp: SmsChannelSettings
  updatedDateUtc: string | null
}

export type UpdateSmsChannel = {
  enabled: boolean
  webhookUrl?: string
  senderId?: string
  authHeader?: string
  clearAuthHeader?: boolean
  sendPaymentReceipts: boolean
  sendMembershipExpiryReminders: boolean
}

export type UpdateSmsSettings = {
  sms: UpdateSmsChannel
  whatsApp: UpdateSmsChannel
}
