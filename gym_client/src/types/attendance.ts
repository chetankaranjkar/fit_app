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
}
