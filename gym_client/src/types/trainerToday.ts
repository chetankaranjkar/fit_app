/** `CheckedIn` is recorded (AttendanceLogs); the other states are inferred from the training schedule. */
export type ExpectedVisitState = 'CheckedIn' | 'AwaitingCheckIn' | 'MissedInferred'

export interface TrainerTodayClient {
  userId: number
  memberName: string
  scheduleLabel?: string | null
  windowStart: string
  windowEnd: string
  state: ExpectedVisitState
  checkInTimeUtc?: string | null
  checkInMethod?: string | null
}

export interface TrainerTodayPtSession {
  sessionId: number
  userId: number
  memberName: string
  scheduledStartUtc: string
  scheduledEndUtc: string
  status: 'Booked' | 'Completed' | 'Cancelled' | 'NoShow' | 'Rescheduled' | string
  attendanceRecorded: boolean
  memberPresent?: boolean | null
  isNoShow?: boolean | null
  isLate?: boolean | null
}

export interface TrainerInferredMiss {
  userId: number
  memberName: string
  localDate: string
  scheduleLabel?: string | null
}

export interface TrainerToday {
  trainerId: number
  localDate: string
  generatedAtUtc: string
  missedLookbackDays: number
  activeClients: number
  configuredMaxActiveClients?: number | null
  effectiveCapacity: number
  clientsWithoutSchedule: number
  expectedToday: TrainerTodayClient[]
  ptSessionsToday: TrainerTodayPtSession[]
  recentInferredMisses: TrainerInferredMiss[]
  recentPtNoShows: TrainerTodayPtSession[]
}
