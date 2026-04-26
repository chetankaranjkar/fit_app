import { api } from '../lib/api'
import type { AttendanceAnomalyDto, AttendanceLogDto } from '../types/attendance'

export interface CheckInDto {
  userId: number
  loggedByUserId?: number
  checkInMethod?: string | null
  notes?: string | null
}

export interface CheckOutDto {
  attendanceLogId: number
  checkOutMethod?: string | null
  notes?: string | null
}

export const attendanceService = {
  getAll: () => api.get<AttendanceLogDto[]>('/AttendanceLogs'),
  getByUserId: (userId: number) => api.get<AttendanceLogDto[]>(`/AttendanceLogs/user/${userId}`),
  getByDateRange: (startDate: string, endDate: string) =>
    api.get<AttendanceLogDto[]>(
      `/AttendanceLogs/daterange?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    ),
  getAnomalies: (date: string, lateThresholdMinutes = 15) =>
    api.get<AttendanceAnomalyDto[]>(
      `/AttendanceLogs/anomalies/${encodeURIComponent(date)}?lateThresholdMinutes=${lateThresholdMinutes}`,
    ),
  checkIn: (data: CheckInDto) => api.post<AttendanceLogDto>('/AttendanceLogs/checkin', data),
  checkOut: (data: CheckOutDto) => api.post<AttendanceLogDto>('/AttendanceLogs/checkout', data),
}
