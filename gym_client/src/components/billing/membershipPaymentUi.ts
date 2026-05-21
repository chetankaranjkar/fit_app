import type { MembershipPaymentMethod, MembershipPaymentStatus } from '../../types/membershipPayment'

export const MEMBERSHIP_PAYMENT_METHODS: MembershipPaymentMethod[] = [
  'Cash',
  'Upi',
  'Card',
  'BankTransfer',
  'Online',
  'Other',
]

export function paymentStatusBadgeClass(status: MembershipPaymentStatus) {
  const s = status.toLowerCase()
  if (s === 'paid') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
  if (s === 'partial') return 'border-amber-500/40 bg-amber-500/15 text-amber-200'
  if (s === 'overdue') return 'border-rose-500/40 bg-rose-500/15 text-rose-200'
  return 'border-slate-500/40 bg-slate-500/15 text-slate-200'
}

export function paymentStatusLabel(status: MembershipPaymentStatus) {
  const s = status.toLowerCase()
  if (s === 'paid') return 'Full payment (paid)'
  if (s === 'partial') return 'Partial payment'
  if (s === 'overdue') return 'Overdue'
  return 'Pending'
}

export function computeNetPayable(
  total: number,
  discount: number,
  waiver: number,
  netPayableAmount?: number,
) {
  if (netPayableAmount != null) return Math.max(0, netPayableAmount)
  return Math.max(0, total - discount - waiver)
}
