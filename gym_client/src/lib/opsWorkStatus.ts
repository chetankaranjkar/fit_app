import { daysUntilDate, daysUntilTimestamp } from './dailyWorkList'

/** Equipment next-service window used on lists, KPIs, and operations reports. */
export const SERVICE_DUE_SOON_DAYS = 7

/** Pending locker tickets older than this many calendar days count as overdue (UI only). */
export const LOCKER_TICKET_SLA_DAYS = 3

export type ServiceUrgency = 'overdue' | 'due_soon' | 'scheduled' | 'none'

export function serviceDaysUntil(nextServiceDate?: string | null, asOf: Date = new Date()): number | null {
  return daysUntilDate(nextServiceDate, asOf) ?? daysUntilTimestamp(nextServiceDate, asOf)
}

export function serviceUrgency(nextServiceDate?: string | null, asOf: Date = new Date()): ServiceUrgency {
  const days = serviceDaysUntil(nextServiceDate, asOf)
  if (days == null) return 'none'
  if (days < 0) return 'overdue'
  if (days <= SERVICE_DUE_SOON_DAYS) return 'due_soon'
  return 'scheduled'
}

export function latestMaintenanceByEquipment(
  logs: Array<{ equipmentId: string; performedAt: string; performedBy: string }>,
): Map<string, { performedAt: string; performedBy: string }> {
  const latest = new Map<string, { performedAt: string; performedBy: string }>()
  for (const log of logs) {
    const prev = latest.get(log.equipmentId)
    if (!prev || Date.parse(log.performedAt) > Date.parse(prev.performedAt)) {
      latest.set(log.equipmentId, { performedAt: log.performedAt, performedBy: log.performedBy })
    }
  }
  return latest
}

export function cleaningIncomplete(tasks: Array<{ done: boolean }>): boolean {
  return tasks.some((t) => !t.done)
}

/** Incomplete work whose scheduled day is before today. Today's unfinished work is due, not overdue. */
export function cleaningIsOverdue(
  log: { scheduledAt: string; tasks: Array<{ done: boolean }> },
  asOf: Date = new Date(),
): boolean {
  if (!cleaningIncomplete(log.tasks)) return false
  const days = daysUntilDate(log.scheduledAt, asOf) ?? daysUntilTimestamp(log.scheduledAt, asOf)
  return days != null && days < 0
}

export function lockerTicketDaysOpen(reportedDate: string, asOf: Date = new Date()): number | null {
  const days = daysUntilDate(reportedDate, asOf) ?? daysUntilTimestamp(reportedDate, asOf)
  if (days == null) return null
  return Math.max(0, -days)
}

export function lockerTicketIsOverdue(
  status: string,
  reportedDate: string,
  asOf: Date = new Date(),
): boolean {
  if (status !== 'PENDING') return false
  const open = lockerTicketDaysOpen(reportedDate, asOf)
  return open != null && open >= LOCKER_TICKET_SLA_DAYS
}
