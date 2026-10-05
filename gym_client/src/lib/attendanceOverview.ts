/** Copy for the attendance dashboard overview. Metrics use the selected date range. */

export type AttendanceOverviewCopy = {
  title: string
  rangeLabel: string
  activeCaption: string
  completedCaption: string
  uniqueCaption: string
  activeSideLabel: string
  completedSideLabel: string
}

/** Asia/Kolkata, also registered as Asia/Calcutta. Fixed UTC+05:30. */
export const GYM_TIME_ZONE = 'Asia/Kolkata'

/** Calendar date in the gym timezone, `YYYY-MM-DD`. */
export function gymCalendarDate(instant: Date, timeZone = GYM_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** Shift a `YYYY-MM-DD` gym date by whole calendar days. */
export function shiftGymCalendarDate(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() + days)
  const yyyy = utc.getUTCFullYear()
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(utc.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Date portion of an API value, ignoring a time or offset that would shift the gym day. */
export function calendarDateFromApi(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  return match?.[1] ?? value
}

export function formatGymDay(iso: string) {
  return formatDay(calendarDateFromApi(iso))
}

function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDay(iso: string) {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function attendanceOverviewCopy(
  startDate: string,
  endDate: string,
  todayIso: string,
): AttendanceOverviewCopy {
  const singleDay = startDate === endDate
  const isToday = singleDay && startDate === todayIso
  const rangeLabel = singleDay
    ? formatDay(startDate)
    : `${formatDay(startDate)} – ${formatDay(endDate)}`

  return {
    title: isToday ? "Today's Overview" : singleDay ? 'Daily Overview' : 'Range Overview',
    rangeLabel,
    activeCaption: isToday ? 'On gym floor now' : 'Still checked in',
    completedCaption: isToday ? 'Checked out today' : 'Checked out in this range',
    uniqueCaption: isToday ? 'unique members today' : 'unique members in this range',
    activeSideLabel: isToday ? 'Active now' : 'Still checked in',
    completedSideLabel: 'Completed',
  }
}

/** Completed visits / total visits, matching AttendanceRangeSummaryDto.SessionCompletionPercent. */
export function sessionCompletionPercent(completed: number, total: number) {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}
