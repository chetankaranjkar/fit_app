import type { MembershipStatus } from '../types/userMembership'

export const membershipStatusOptions: MembershipStatus[] = [
  'Active',
  'ActivePendingPayment',
  'PartialPayment',
  'Paused',
  'Expired',
]

export const membershipStatusLabel: Partial<Record<MembershipStatus, string>> = {
  Active: 'Active',
  ActivePendingPayment: 'Active (Pending Payment)',
  PartialPayment: 'Partial Payment',
  Paused: 'Paused',
  Expired: 'Expired',
  Frozen: 'Frozen',
  Cancelled: 'Cancelled',
  Pending: 'Pending',
  VoidPending: 'Void pending',
  Voided: 'Voided',
  Transferred: 'Transferred',
}

/** Add days to a date string (YYYY-MM-DD), return YYYY-MM-DD */
export function addDaysToIsoDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) return dateStr
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Default start date when renewing from an existing membership row. */
export function renewStartDateForMembership(membership: {
  status: string
  endDate: string
}): string {
  if (membership.status === 'Expired') return todayIsoDate()
  const today = todayIsoDate()
  const dayAfterEnd = addDaysToIsoDate(membership.endDate.slice(0, 10), 1)
  return dayAfterEnd < today ? today : dayAfterEnd
}

export const membershipFormSelectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

export const membershipFormLabelClass =
  'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'
