import { formatInr } from './formatInr'
import type { MembershipStatus, UserMembership } from '../types/userMembership'
import type { User } from '../types/user'

export const RENEW_MEMBERSHIP_LABEL = 'Renew membership'
export const COLLECT_OUTSTANDING_LABEL = 'Collect outstanding payment'
/** Member-facing counterpart of collect: members pay, staff collect. */
export const PAY_OUTSTANDING_LABEL = 'Pay outstanding balance'
export const ADD_MEMBERSHIP_LABEL = 'Add membership'

export type StandingTone = 'good' | 'warn' | 'bad' | 'muted'

export type StandingFact = { label: string; detail?: string; tone: StandingTone }

export type StandingActionRule = { allowed: boolean; label: string; reason?: string }

export type StandingNextAction = {
  kind: 'collect' | 'renew' | 'resolve' | 'none'
  label: string
  detail: string
}

export type MembershipStanding = {
  hasMembership: boolean
  status: MembershipStatus | null
  planName: string | null
  access: StandingFact & { allowed: boolean }
  dates: StandingFact
  payment: StandingFact
  outstanding: StandingFact & { amount: number }
  collect: StandingActionRule
  /** `extend` = renew-access on the same row; `new` = new period via the add/renew membership modal. */
  renew: StandingActionRule & { mode: 'extend' | 'new' }
  next: StandingNextAction
}

export type MembershipStandingInput = {
  status: MembershipStatus | string | null | undefined
  planName?: string | null
  startDate?: string | null
  endDate?: string | null
  /** Pending amount on this membership's bill; `null`/`undefined` when billing was not loaded. */
  outstanding?: number | null
  /** Billing header status: Paid, Partial, Pending, Overdue. */
  billingStatus?: string | null
  isOverdue?: boolean
  asOf?: Date
}

const BALANCE_EPSILON = 0.02
const RENEWAL_WINDOW_DAYS = 14

/** Mirrors `UserMembershipRules.GymCheckInAllowedStatuses`. */
const CHECK_IN_STATUSES = new Set<string>(['Active', 'ActivePendingPayment', 'PartialPayment'])
/** Mirrors `UserMembershipRules.IsTerminalForReporting` / `AllowsPaymentCollection`. */
const TERMINAL_STATUSES = new Set<string>(['Cancelled', 'Voided', 'Transferred'])
const UNPAID_STATUSES = new Set<string>(['ActivePendingPayment', 'PartialPayment'])

function isoDay(value?: string | null): string | null {
  if (!value) return null
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

function todayIso(asOf?: Date): string {
  return (asOf ?? new Date()).toISOString().slice(0, 10)
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000)
}

export function formatStandingDate(value?: string | null): string {
  const day = isoDay(value)
  if (!day) return '—'
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusWord(status: string): string {
  return status.toLowerCase()
}

function accessFact(status: string | null, endIso: string | null, today: string, outstanding: number) {
  if (!status) {
    return { allowed: false, label: 'No access', detail: 'No membership on file.', tone: 'bad' as const }
  }
  if (TERMINAL_STATUSES.has(status)) {
    return { allowed: false, label: 'No access', detail: `Membership was ${statusWord(status)}.`, tone: 'bad' as const }
  }
  const ended = endIso != null && endIso < today
  if (ended || status === 'Expired') {
    return {
      allowed: false,
      label: 'No access',
      detail: endIso ? `Membership ended ${formatStandingDate(endIso)}.` : 'Membership has expired.',
      tone: 'bad' as const,
    }
  }
  if (status === 'Frozen' || status === 'Paused') {
    return { allowed: false, label: 'No access', detail: `Membership is ${statusWord(status)}.`, tone: 'warn' as const }
  }
  if (status === 'Pending') {
    return { allowed: false, label: 'No access', detail: 'Membership is awaiting approval.', tone: 'warn' as const }
  }
  if (status === 'VoidPending') {
    return { allowed: false, label: 'No access', detail: 'A void request is awaiting approval.', tone: 'warn' as const }
  }
  if (CHECK_IN_STATUSES.has(status)) {
    return {
      allowed: true,
      label: 'Access allowed',
      detail:
        outstanding > BALANCE_EPSILON
          ? 'Check-in allowed while the balance is due.'
          : endIso
            ? `Check-in allowed until ${formatStandingDate(endIso)}.`
            : 'Check-in allowed.',
      tone: outstanding > BALANCE_EPSILON ? ('warn' as const) : ('good' as const),
    }
  }
  return { allowed: false, label: 'No access', detail: `Status: ${status}.`, tone: 'muted' as const }
}

function datesFact(startIso: string | null, endIso: string | null, today: string): StandingFact {
  if (!startIso && !endIso) return { label: '—', tone: 'muted' }
  const label = `${formatStandingDate(startIso)} – ${formatStandingDate(endIso)}`
  if (!endIso) return { label, tone: 'muted' }
  const days = daysBetween(today, endIso)
  if (startIso && startIso > today) {
    return { label, detail: `Starts in ${daysBetween(today, startIso)} days`, tone: 'muted' }
  }
  if (days < 0) {
    const ago = Math.abs(days)
    return { label, detail: ago === 1 ? 'Ended yesterday' : `Ended ${ago} days ago`, tone: 'bad' }
  }
  if (days === 0) return { label, detail: 'Ends today', tone: 'warn' }
  return {
    label,
    detail: days === 1 ? '1 day left' : `${days} days left`,
    tone: days <= 7 ? 'warn' : 'good',
  }
}

function paymentFact(
  status: string | null,
  outstanding: number,
  billingKnown: boolean,
  billingStatus: string,
  overdue: boolean,
): StandingFact {
  if (!status) return { label: '—', tone: 'muted' }
  if (TERMINAL_STATUSES.has(status)) {
    return { label: 'Billing closed', detail: `No payments on ${statusWord(status)} memberships.`, tone: 'muted' }
  }
  if (outstanding > BALANCE_EPSILON) {
    if (overdue) return { label: 'Overdue', tone: 'bad' }
    if (billingStatus === 'partial' || status === 'PartialPayment') return { label: 'Partially paid', tone: 'warn' }
    return { label: 'Unpaid', tone: 'warn' }
  }
  if (!billingKnown) {
    if (status === 'PartialPayment') return { label: 'Partially paid', tone: 'warn' }
    if (status === 'ActivePendingPayment') return { label: 'Unpaid', tone: 'warn' }
    if (!billingStatus) return { label: 'No bill raised', tone: 'muted' }
  }
  return { label: 'Paid in full', tone: 'good' }
}

function collectRule(status: string | null, outstanding: number, billingKnown: boolean): StandingActionRule {
  const label = COLLECT_OUTSTANDING_LABEL
  if (!status) return { allowed: false, label, reason: 'There is no membership to bill.' }
  if (TERMINAL_STATUSES.has(status)) {
    return { allowed: false, label, reason: `Billing is closed for ${statusWord(status)} memberships.` }
  }
  if (outstanding > BALANCE_EPSILON) return { allowed: true, label }
  if (!billingKnown && UNPAID_STATUSES.has(status)) return { allowed: true, label }
  return { allowed: false, label, reason: 'Nothing is outstanding on this membership.' }
}

function renewRule(status: string | null): StandingActionRule & { mode: 'extend' | 'new' } {
  if (!status) return { allowed: true, mode: 'new', label: ADD_MEMBERSHIP_LABEL }
  switch (status) {
    case 'Active':
    case 'Frozen':
    case 'Paused':
      return { allowed: true, mode: 'extend', label: RENEW_MEMBERSHIP_LABEL }
    case 'ActivePendingPayment':
    case 'PartialPayment':
      return {
        allowed: false,
        mode: 'extend',
        label: RENEW_MEMBERSHIP_LABEL,
        reason: 'Collect the outstanding payment first. Renewal extends a paid membership.',
      }
    case 'Expired':
      return { allowed: true, mode: 'new', label: RENEW_MEMBERSHIP_LABEL }
    case 'Pending':
      return { allowed: false, mode: 'extend', label: RENEW_MEMBERSHIP_LABEL, reason: 'The membership is awaiting approval.' }
    case 'VoidPending':
      return {
        allowed: false,
        mode: 'extend',
        label: RENEW_MEMBERSHIP_LABEL,
        reason: 'A void request is pending. An admin must approve or reject it first.',
      }
    default:
      return { allowed: true, mode: 'new', label: 'Start new membership' }
  }
}

function nextAction(
  status: string | null,
  access: { allowed: boolean },
  collect: StandingActionRule,
  renew: StandingActionRule,
  outstanding: number,
  overdue: boolean,
  endIso: string | null,
  today: string,
): StandingNextAction {
  if (collect.allowed) {
    return {
      kind: 'collect',
      label: COLLECT_OUTSTANDING_LABEL,
      detail: overdue
        ? `${formatInr(outstanding)} is overdue.`
        : outstanding > BALANCE_EPSILON
          ? `${formatInr(outstanding)} is due on this membership.`
          : 'Payment is due on this membership.',
    }
  }
  if (!access.allowed) {
    if (status === 'Frozen' || status === 'Paused') {
      return { kind: 'resolve', label: 'Unfreeze membership', detail: 'Change the status in Edit membership to restore access.' }
    }
    if (status === 'Pending' || status === 'VoidPending') {
      return { kind: 'resolve', label: 'Review approval', detail: 'An admin decides this in Membership approvals.' }
    }
    if (renew.allowed) {
      return { kind: 'renew', label: renew.label, detail: status ? 'Renew to restore gym access.' : 'Add a plan to give gym access.' }
    }
  }
  if (access.allowed && endIso && renew.allowed) {
    const days = daysBetween(today, endIso)
    if (days <= RENEWAL_WINDOW_DAYS) {
      return { kind: 'renew', label: renew.label, detail: days === 0 ? 'Ends today.' : `Ends in ${days} days.` }
    }
  }
  return { kind: 'none', label: 'Nothing needed', detail: 'Membership and billing are up to date.' }
}

export function deriveMembershipStanding(input: MembershipStandingInput): MembershipStanding {
  const status = (input.status as MembershipStatus | null | undefined) ?? null
  const today = todayIso(input.asOf)
  const startIso = isoDay(input.startDate)
  const endIso = isoDay(input.endDate)
  const billingKnown = input.outstanding != null
  const outstanding = Math.max(0, Number(input.outstanding ?? 0))
  const billingStatus = (input.billingStatus ?? '').toLowerCase()
  const overdue = outstanding > BALANCE_EPSILON && (input.isOverdue === true || billingStatus === 'overdue')

  const access = accessFact(status, endIso, today, outstanding)
  const collect = collectRule(status, outstanding, billingKnown)
  const renew = renewRule(status)

  return {
    hasMembership: status != null,
    status,
    planName: input.planName?.trim() || null,
    access,
    dates: datesFact(startIso, endIso, today),
    payment: paymentFact(status, outstanding, billingKnown, billingStatus, overdue),
    outstanding: {
      amount: outstanding,
      label: outstanding > BALANCE_EPSILON ? formatInr(outstanding) : billingKnown ? formatInr(0) : '—',
      detail: overdue ? 'Overdue' : undefined,
      tone: overdue ? 'bad' : outstanding > BALANCE_EPSILON ? 'warn' : 'muted',
    },
    collect,
    renew,
    next: nextAction(status, access, collect, renew, outstanding, overdue, endIso, today),
  }
}

export function standingFromUserMembership(m: UserMembership, asOf?: Date): MembershipStanding {
  const hasBillingRecord = m.membershipPaymentId != null || m.paymentStatus != null
  return deriveMembershipStanding({
    status: m.status,
    planName: m.planName,
    startDate: m.startDate,
    endDate: m.endDate,
    outstanding: hasBillingRecord ? (m.pendingAmount ?? 0) : null,
    billingStatus: m.paymentStatus,
    asOf,
  })
}

/** Directory row: membership from `MemberOnboardingRules.ResolveDisplayMembership`, billing of that membership. */
export function standingFromUser(u: User, asOf?: Date): MembershipStanding {
  const balanceOnThisMembership =
    u.membershipId != null && u.openMembershipId === u.membershipId ? (u.pendingPaymentAmount ?? 0) : 0
  return deriveMembershipStanding({
    status: u.membershipStatus,
    planName: u.membershipPlanName,
    startDate: u.membershipStartDate,
    endDate: u.membershipEndDate,
    outstanding: u.membershipBillingStatus != null || u.outstandingBalance != null ? balanceOnThisMembership : null,
    billingStatus: u.membershipBillingStatus,
    isOverdue: u.openMembershipId === u.membershipId && u.isPaymentOverdue,
    asOf,
  })
}

export const STANDING_TONE_TEXT: Record<StandingTone, string> = {
  good: 'text-emerald-300',
  warn: 'text-amber-200',
  bad: 'text-rose-300',
  muted: 'text-slate-400',
}

export const STANDING_TONE_DOT: Record<StandingTone, string> = {
  good: 'bg-emerald-400',
  warn: 'bg-amber-400',
  bad: 'bg-rose-400',
  muted: 'bg-slate-500',
}
