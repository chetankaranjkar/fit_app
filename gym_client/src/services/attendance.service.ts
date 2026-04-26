import { api } from '../lib/api'
import type { AttendanceLogDto } from '../types/attendance'

export const attendanceService = {
  getByUserId: (userId: number) => api.get<AttendanceLogDto[]>(`/AttendanceLogs/user/${userId}`),
}
