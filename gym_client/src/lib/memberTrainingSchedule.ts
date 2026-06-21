import { MEMBER_BATCH_VALUES, memberBatchLabel } from './memberBatches'

export type TrainingScheduleType = 'Batch' | 'Custom'

export const TRAINING_DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const

export const BATCH_TIME_WINDOWS: Record<(typeof MEMBER_BATCH_VALUES)[number], string> = {
  Morning: '6:00 AM – 10:00 AM',
  Afternoon: '10:00 AM – 2:00 PM',
  Evening: '2:00 PM – 6:00 PM',
  Night: '6:00 PM – 10:00 PM',
}

export interface MemberTrainingScheduleValue {
  trainingScheduleType: TrainingScheduleType
  preferredGymTime: string
  trainingStartTime: string
  trainingEndTime: string
  trainingDaysOfWeek: number[]
  overrideTrainingScheduleConflict: boolean
}

export interface TrainingScheduleConflict {
  userId: number
  memberName: string
  scheduleLabel: string
  overlapDays: string
  overlapTime: string
}

export const DEFAULT_TRAINING_SCHEDULE: MemberTrainingScheduleValue = {
  trainingScheduleType: 'Batch',
  preferredGymTime: '',
  trainingStartTime: '06:30',
  trainingEndTime: '07:30',
  trainingDaysOfWeek: [1, 2, 3, 4, 5],
  overrideTrainingScheduleConflict: false,
}

export function parseTrainingDays(csv?: string | null): number[] {
  if (!csv?.trim()) return [0, 1, 2, 3, 4, 5, 6]
  const days = csv
    .split(',')
    .map((part) => parseInt(part.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  return days.length ? [...new Set(days)].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6]
}

export function serializeTrainingDays(days: number[]): string {
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b).join(',')
}

export function timeSpanToInput(value?: string | null): string {
  if (!value) return ''
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return ''
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

export function inputTimeToApi(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed
}

export function trainingScheduleFromUser(user?: {
  trainingScheduleType?: string | null
  preferredGymTime?: string | null
  trainingStartTime?: string | null
  trainingEndTime?: string | null
  trainingDaysOfWeek?: string | null
}): MemberTrainingScheduleValue {
  const type =
    user?.trainingScheduleType === 'Custom' || user?.trainingStartTime ? 'Custom' : 'Batch'
  return {
    trainingScheduleType: type,
    preferredGymTime: user?.preferredGymTime ?? '',
    trainingStartTime: timeSpanToInput(user?.trainingStartTime) || DEFAULT_TRAINING_SCHEDULE.trainingStartTime,
    trainingEndTime: timeSpanToInput(user?.trainingEndTime) || DEFAULT_TRAINING_SCHEDULE.trainingEndTime,
    trainingDaysOfWeek: parseTrainingDays(user?.trainingDaysOfWeek),
    overrideTrainingScheduleConflict: false,
  }
}

export function formatTrainingScheduleLabel(input?: {
  trainingScheduleType?: string | null
  preferredGymTime?: string | null
  trainingStartTime?: string | null
  trainingEndTime?: string | null
  trainingDaysOfWeek?: string | null
  trainingScheduleLabel?: string | null
}): string {
  if (input?.trainingScheduleLabel?.trim()) return input.trainingScheduleLabel
  if (input?.trainingScheduleType === 'Custom' || input?.trainingStartTime) {
    const start = formatDisplayTime(input.trainingStartTime)
    const end = formatDisplayTime(input.trainingEndTime)
    if (start && end) {
      const days = formatDayList(parseTrainingDays(input.trainingDaysOfWeek))
      return days === 'Daily' ? `${start} – ${end}` : `${start} – ${end} (${days})`
    }
  }
  if (input?.preferredGymTime) {
    const batch = input.preferredGymTime as (typeof MEMBER_BATCH_VALUES)[number]
    const window = BATCH_TIME_WINDOWS[batch]
    return window ? `${memberBatchLabel(batch)} · ${window}` : memberBatchLabel(input.preferredGymTime)
  }
  return 'Unassigned'
}

function formatDisplayTime(value?: string | null): string {
  const input = timeSpanToInput(value)
  if (!input) return ''
  const [hourStr, minuteStr] = input.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${minuteStr} ${suffix}`
}

function formatDayList(days: number[]): string {
  if (days.length === 0 || days.length === 7) return 'Daily'
  return days.map((day) => TRAINING_DAY_OPTIONS.find((d) => d.value === day)?.label ?? String(day)).join(', ')
}

export function buildTrainingSchedulePayload(value: MemberTrainingScheduleValue) {
  if (value.trainingScheduleType === 'Custom') {
    return {
      trainingScheduleType: 'Custom' as const,
      preferredGymTime: null,
      trainingStartTime: inputTimeToApi(value.trainingStartTime),
      trainingEndTime: inputTimeToApi(value.trainingEndTime),
      trainingDaysOfWeek: serializeTrainingDays(value.trainingDaysOfWeek),
      overrideTrainingScheduleConflict: value.overrideTrainingScheduleConflict,
    }
  }

  return {
    trainingScheduleType: 'Batch' as const,
    preferredGymTime: value.preferredGymTime?.trim() || null,
    trainingStartTime: null,
    trainingEndTime: null,
    trainingDaysOfWeek: null,
    overrideTrainingScheduleConflict: value.overrideTrainingScheduleConflict,
  }
}

export function isTrainingScheduleValid(value: MemberTrainingScheduleValue): boolean {
  if (value.trainingScheduleType === 'Custom') {
    if (!value.trainingStartTime || !value.trainingEndTime) return false
    if (value.trainingStartTime >= value.trainingEndTime) return false
    return value.trainingDaysOfWeek.length > 0
  }
  return Boolean(value.preferredGymTime?.trim())
}

export function memberHasTrainingToday(
  user: {
    trainingScheduleType?: string | null
    preferredGymTime?: string | null
    trainingDaysOfWeek?: string | null
  },
  dayOfWeek: number,
): boolean {
  if (user.trainingScheduleType === 'Custom' || user.trainingDaysOfWeek) {
    return parseTrainingDays(user.trainingDaysOfWeek).includes(dayOfWeek)
  }
  return Boolean(user.preferredGymTime)
}

export function memberTrainingTimeRange(user: {
  trainingScheduleType?: string | null
  preferredGymTime?: string | null
  trainingStartTime?: string | null
  trainingEndTime?: string | null
}): { start: string; end: string } | null {
  if (user.trainingScheduleType === 'Custom' || user.trainingStartTime) {
    const start = timeSpanToInput(user.trainingStartTime)
    const end = timeSpanToInput(user.trainingEndTime)
    return start && end ? { start, end } : null
  }
  const batch = user.preferredGymTime as (typeof MEMBER_BATCH_VALUES)[number] | undefined
  if (!batch) return null
  const map: Record<(typeof MEMBER_BATCH_VALUES)[number], { start: string; end: string }> = {
    Morning: { start: '06:00', end: '10:00' },
    Afternoon: { start: '10:00', end: '14:00' },
    Evening: { start: '14:00', end: '18:00' },
    Night: { start: '18:00', end: '22:00' },
  }
  return map[batch] ?? null
}
