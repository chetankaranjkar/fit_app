import { api } from '../lib/api'
import type { AttendanceAnomalyDto, AttendanceLogDto } from '../types/attendance'
import type { AttendanceScanResponseDto } from '../types/qr'

export type CheckInBody = {
  userId: number
  loggedByUserId?: number
  checkInMethod?: string | null
  notes?: string | null
}

export type CheckOutBody = {
  attendanceLogId: number
  checkOutMethod?: string | null
  notes?: string | null
}

export type AttendanceScanRequestBody = {
  qrToken: string
  latitude: number
  longitude: number
  clientScanId: string
}

export type GymQrWorkoutLogBody = {
  sessionId: string
  exerciseName: string
  reps: number
  weight: number
}

export type GymQrWorkoutLogResponse = {
  logId: number
  sessionId: string
  createdAtUtc: string
}

export const attendanceService = {
  getByDateRange: (startDate: string, endDate: string) =>
    api.get<AttendanceLogDto[]>('/AttendanceLogs/daterange', {
      params: { startDate, endDate },
    }),

  getByUserId: (userId: number) => api.get<AttendanceLogDto[]>(`/AttendanceLogs/user/${userId}`),

  getAnomalies: (date: string) => api.get<AttendanceAnomalyDto[]>(`/AttendanceLogs/anomalies/${date}`),

  checkIn: (body: CheckInBody) => api.post<AttendanceLogDto>('/AttendanceLogs/checkin', body),

  checkOut: (body: CheckOutBody) => api.post<AttendanceLogDto>('/AttendanceLogs/checkout', body),

  scan: (body: AttendanceScanRequestBody) =>
    api.post<AttendanceScanResponseDto>('/Attendance/scan', body),

  logWorkout: (body: GymQrWorkoutLogBody) => api.post<GymQrWorkoutLogResponse>('/workout/log', body),

  endSession: (sessionId: string) => api.post('/workout/end', { sessionId }),
}
