import { formatInr } from './formatInr'
import type { UserMembership } from '../types/userMembership'

export type UserMembershipQuickFilter =
  | 'all'
  | 'needsPayment'
  | 'expiring14'
  | 'voidPending'
  | 'expired'
  | 'terminal'

export function parseUserMembershipQuickFilter(raw: string | null): UserMembershipQuickFilter {
  switch (raw?.trim()) {
    case 'needsPayment':
      return 'needsPayment'
    case 'expiring14':
      return 'expiring14'
    case 'voidPending':
      return 'voidPending'
    case 'expired':
      return 'expired'
    case 'terminal':
      return 'terminal'
    default:
      return 'all'
  }
}

export function membershipDaysLeftLabel(m: Pick<UserMembership, 'daysRemaining' | 'isExpired'>): string {
  const days = m.daysRemaining ?? 0
  if (m.isExpired || days < 0) {
    const daysAgo = Math.abs(days)
    if (daysAgo === 0) return 'Expired today'
    if (daysAgo === 1) return 'Expired 1d ago'
    return `Expired ${daysAgo}d ago`
  }
  if (days === 0) return 'Ends today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

export function membershipDaysLeftClass(m: Pick<UserMembership, 'daysRemaining' | 'isExpired'>): string {
  const days = m.daysRemaining ?? 0
  if (m.isExpired || days < 0) return 'text-rose-300'
  if (days <= 3) return 'text-rose-300'
  if (days <= 7) return 'text-amber-200'
  return 'text-slate-300'
}

export function membershipPaymentSummary(m: Pick<UserMembership, 'isFullyPaid' | 'pendingAmount' | 'paymentStatus'>): string {
  if (m.isFullyPaid) return 'Fully paid'
  const pending = m.pendingAmount ?? 0
  if (pending > 0.02) {
    const status = m.paymentStatus?.toLowerCase()
    if (status === 'overdue') return `Overdue · ${formatInr(pending)}`
    if (status === 'partial') return `Partial · ${formatInr(pending)}`
    return `${formatInr(pending)} due`
  }
  return 'Payment pending'
}

export function membershipPaymentClass(m: Pick<UserMembership, 'isFullyPaid' | 'pendingAmount' | 'paymentStatus'>): string {
  if (m.isFullyPaid) return 'text-emerald-300'
  const pending = m.pendingAmount ?? 0
  if (pending > 0.02) {
    const status = m.paymentStatus?.toLowerCase()
    if (status === 'overdue') return 'text-rose-300'
    return 'text-amber-200'
  }
  return 'text-slate-400'
}
