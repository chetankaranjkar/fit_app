export interface AttendanceLogDto {
  id: number
  userId: number
  userName: string
  checkInTime: string
  checkOutTime?: string | null
  attendanceDate: string
  durationMinutes?: number | null
  notes?: string | null
  checkInMethod?: string | null
  checkOutMethod?: string | null
  isCheckedIn: boolean
  exceptionReason?: string | null
  correctionAuditNote?: string | null
  isManualCorrection?: boolean
  correctedByUserId?: number | null
  correctedAt?: string | null
}

export interface AttendanceAnomalyDto {
  userId: number
  userName: string
  attendanceDate: string
  type: 'late' | 'no_show'
  message: string
  attendanceLogId?: number | null
  lateByMinutes?: number | null
}
