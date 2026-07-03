export interface NotificationTemplate {
  id: number
  templateCode: string
  templateName: string
  channel: 'Email' | 'SMS'
  subject?: string | null
  body: string
  isHtml: boolean
  isActive: boolean
  isCustomized: boolean
  createdDate: string
  updatedDate?: string | null
}

export interface UpdateNotificationTemplate {
  templateName?: string
  subject?: string | null
  body?: string
  isActive?: boolean
}

export interface NotificationTemplatePreview {
  templateCode: string
  channel: string
  subject?: string | null
  body: string
  isHtml: boolean
}

export interface NotificationTemplateQuery {
  search?: string
  channel?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface NotificationHistoryItem {
  id: number
  memberId?: number | null
  notificationType: string
  channel: string
  recipient: string
  subject?: string | null
  message: string
  status: string
  sentDate?: string | null
  errorMessage?: string | null
  retryCount: number
  createdDate: string
}

export const NOTIFICATION_PLACEHOLDERS = [
  'GymName',
  'LogoUrl',
  'MemberName',
  'MemberId',
  'ReceiptNumber',
  'InvoiceNumber',
  'PlanName',
  'PlanDuration',
  'Amount',
  'PaymentMode',
  'PaymentStatus',
  'PaymentDate',
  'StartDate',
  'EndDate',
  'TrainerName',
  'WorkoutName',
  'AttendanceDate',
  'AttendanceTime',
  'OTP',
  'SupportEmail',
  'SupportPhone',
  'CurrentYear',
] as const
