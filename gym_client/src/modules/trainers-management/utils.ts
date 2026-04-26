import type { ReportFilters, SessionEntry, TrainerRecord } from './types'

export function inDateRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate
}

export function sessionsByTrainer(
  sessions: SessionEntry[],
  filters: ReportFilters,
): Record<string, number> {
  return sessions.reduce<Record<string, number>>((acc, session) => {
    const trainerMatch = filters.trainerId === 'all' || session.trainerId === filters.trainerId
    if (!trainerMatch) return acc
    if (!inDateRange(session.date, filters.startDate, filters.endDate)) return acc
    acc[session.trainerId] = (acc[session.trainerId] ?? 0) + session.count
    return acc
  }, {})
}

export function csvEscape(value: string | number) {
  const safe = String(value).replaceAll('"', '""')
  return `"${safe}"`
}

export function downloadCsv(fileName: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function salaryBaseForTrainer(
  trainer: TrainerRecord,
  totalSessions: number,
): number {
  return trainer.salaryType === 'fixed'
    ? trainer.salaryAmount
    : trainer.salaryAmount * totalSessions
}
