export type EmailProvider = 'gmail' | 'outlook' | 'custom'

export type EmailSettings = {
  enabled: boolean
  provider: EmailProvider | string
  smtpHost: string | null
  smtpPort: number
  smtpUseStartTls: boolean
  smtpUsername: string | null
  hasPasswordConfigured: boolean
  fromAddress: string | null
  fromDisplayName: string | null
  sendPaymentReceipts: boolean
  sendMembershipExpiryReminders: boolean
  sendDietAssignments: boolean
  isConfigured: boolean
  passwordNeedsReentry: boolean
  updatedDateUtc: string | null
}

export type UpdateEmailSettings = {
  enabled: boolean
  provider: EmailProvider | string
  smtpHost: string
  smtpPort: number
  smtpUseStartTls: boolean
  smtpUsername: string
  smtpPassword?: string
  fromAddress: string
  fromDisplayName?: string
  sendPaymentReceipts: boolean
  sendMembershipExpiryReminders: boolean
  sendDietAssignments: boolean
}
