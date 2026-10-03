import { authService } from '../services/auth.service'
import { formatInr } from './formatInr'
import { getMembershipCollectPaymentPath, memberProfilePath } from './membershipPaymentNavigation'
import { COLLECT_OUTSTANDING_LABEL, RENEW_MEMBERSHIP_LABEL } from './membershipStanding'
import type { ExpiringMembershipQueueItem, UserMembership } from '../types/userMembership'
import type { GymLeadSummary } from '../types/leads'
import type { MembershipApprovalRequest } from '../types/membershipLifecycle'
import type { WaiveOffRequest } from '../services/waiveOffRequests.service'

export type DailyWorkBucket = 'overdue' | 'upcoming'
export type DailyWorkKind = 'renewal' | 'payment' | 'lead' | 'approval' | 'waive-off'

export type DailyWorkAction =
  | { kind: 'link'; label: string; to: string }
  | { kind: 'renew'; label: string; userId: number }

export type DailyWorkItem = {
  key: string
  kind: DailyWorkKind
  bucket: DailyWorkBucket
  title: string
  titleTo?: string
  detail: string
  badge: string
  /** Days until due; negative when overdue. Lower sorts first. */
  urgency: number
  actions: DailyWorkAction[]
}

export const PAYMENT_DUE_SOON_DAYS = 7
export const LEAD_FOLLOW_UP_WINDOW_DAYS = 7
export const DASHBOARD_RETURN_PATH = '/dashboard'

const CLOSED_LEAD_STATUSES = new Set(['CONVERTED', 'NOT_INTERESTED'])

export type DailyWorkAccess = {
  payments: boolean
  leads: boolean
  membershipApprovals: boolean
  waiveOffApprovals: boolean
}

/** Mirrors the API permission on each source endpoint so no section queries what it cannot read. */
export function getDailyWorkAccess(): DailyWorkAccess {
  const codes = authService.permissionCodes
  const payments = authService.hasPermission(codes.payments)
  return {
    payments,
    leads: authService.hasPermission(codes.leadsCrm) || authService.hasPermission(codes.leadsTrainer),
    membershipApprovals: payments && authService.canApproveMembershipRequest(),
    waiveOffApprovals: payments && authService.hasPermission(codes.approveWaiveOff),
  }
}

export function hasAnyDailyWorkAccess(access: DailyWorkAccess = getDailyWorkAccess()): boolean {
  return access.payments || access.leads
}

function dayStartUtc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function localIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Calendar days from `asOf` to a date-only API value (`2026-10-05` / `2026-10-05T00:00:00`). */
export function daysUntilDate(value: string | null | undefined, asOf: Date = new Date()): number | null {
  const day = value?.slice(0, 10)
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return Math.round((dayStartUtc(day) - dayStartUtc(localIso(asOf))) / 86_400_000)
}

/** Calendar days from `asOf` to a timestamp, using the viewer's local day. */
export function daysUntilTimestamp(value: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!value) return null
  const t = new Date(value)
  if (Number.isNaN(t.getTime())) return null
  return Math.round((dayStartUtc(localIso(t)) - dayStartUtc(localIso(asOf))) / 86_400_000)
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function overdueBadge(daysLate: number, verb = 'overdue'): string {
  if (daysLate <= 0) return `Due today`
  return `${plural(daysLate, 'day')} ${verb}`
}

export function dueInBadge(days: number, prefix = 'Due'): string {
  if (days <= 0) return `${prefix} today`
  if (days === 1) return `${prefix} tomorrow`
  return `${prefix} in ${plural(days, 'day')}`
}

function memberName(name: string | null | undefined, userId: number) {
  return name?.trim() || `Member #${userId}`
}

export function renewalQueueWorkItems(items: ExpiringMembershipQueueItem[]): DailyWorkItem[] {
  return items.map((item) => {
    const actions: DailyWorkAction[] = []
    const collectTo = getMembershipCollectPaymentPath(item, DASHBOARD_RETURN_PATH)
    if (collectTo) actions.push({ kind: 'link', label: COLLECT_OUTSTANDING_LABEL, to: collectTo })
    actions.push({ kind: 'renew', label: RENEW_MEMBERSHIP_LABEL, userId: item.userId })
    const balance = item.pendingAmount > 0.02 && !item.isFullyPaid ? ` · ${formatInr(item.pendingAmount)} due` : ''
    const daysAgo = Math.abs(item.daysRemaining)
    return {
      key: `renewal-${item.id}`,
      kind: 'renewal',
      bucket: item.isExpired ? 'overdue' : 'upcoming',
      title: memberName(item.userName, item.userId),
      titleTo: memberProfilePath(item.userId),
      detail: `${item.isExpired ? 'Membership expired' : 'Membership ending'} · ${item.planName ?? 'Plan'}${balance}`,
      badge: item.isExpired
        ? daysAgo === 0
          ? 'Expired today'
          : `Expired ${plural(daysAgo, 'day')} ago`
        : dueInBadge(item.daysRemaining, 'Ends'),
      urgency: item.isExpired ? -Math.max(daysAgo, 0) : item.daysRemaining,
      actions,
    }
  })
}

/**
 * Outstanding balances from `GET /UserMemberships/paged?needsPayment=true`. Overdue follows the server's
 * billing status (or a past due date); upcoming uses the same 7-day window as `upcomingDueCount`.
 * Memberships already in the renewal queue are skipped — their renewal row carries the collect action.
 */
export function paymentWorkItems(
  memberships: UserMembership[],
  skipMembershipIds: ReadonlySet<number>,
  asOf: Date = new Date(),
): DailyWorkItem[] {
  const out: DailyWorkItem[] = []
  for (const m of memberships) {
    if (skipMembershipIds.has(m.id)) continue
    const pending = m.pendingAmount ?? 0
    if (pending <= 0.02 || m.isFullyPaid) continue
    const collectTo = getMembershipCollectPaymentPath(m, DASHBOARD_RETURN_PATH)
    if (!collectTo) continue
    const dueIn = daysUntilDate(m.nextDueDate, asOf)
    const overdue = m.paymentStatus?.toLowerCase() === 'overdue' || (dueIn != null && dueIn < 0)
    if (!overdue && (dueIn == null || dueIn > PAYMENT_DUE_SOON_DAYS)) continue
    const daysLate = dueIn != null && dueIn < 0 ? -dueIn : 0
    out.push({
      key: `payment-${m.id}`,
      kind: 'payment',
      bucket: overdue ? 'overdue' : 'upcoming',
      title: memberName(m.userName, m.userId),
      titleTo: memberProfilePath(m.userId),
      detail: `${formatInr(pending)} outstanding · ${m.planName ?? 'Plan'}`,
      badge: overdue ? (daysLate > 0 ? overdueBadge(daysLate) : 'Payment overdue') : dueInBadge(dueIn ?? 0),
      urgency: overdue ? -daysLate : (dueIn ?? 0),
      actions: [{ kind: 'link', label: COLLECT_OUTSTANDING_LABEL, to: collectTo }],
    })
  }
  return out
}

export function leadReceptionPath(leadId: number): string {
  return `/dashboard/reception?lead=${leadId}`
}

export function leadFollowUpWorkItems(leads: GymLeadSummary[], asOf: Date = new Date()): DailyWorkItem[] {
  const out: DailyWorkItem[] = []
  for (const lead of leads) {
    if (CLOSED_LEAD_STATUSES.has(lead.status)) continue
    const dueIn = daysUntilTimestamp(lead.nextFollowUpAt, asOf)
    if (dueIn == null || dueIn >= LEAD_FOLLOW_UP_WINDOW_DAYS) continue
    const to = leadReceptionPath(lead.id)
    out.push({
      key: `lead-${lead.id}`,
      kind: 'lead',
      bucket: dueIn < 0 ? 'overdue' : 'upcoming',
      title: lead.fullName?.trim() || `Lead #${lead.id}`,
      titleTo: to,
      detail: `Lead follow-up · ${lead.status.replace(/_/g, ' ').toLowerCase()}${lead.phone ? ` · ${lead.phone}` : ''}`,
      badge: dueIn < 0 ? overdueBadge(-dueIn) : dueInBadge(dueIn),
      urgency: dueIn,
      actions: [{ kind: 'link', label: 'Open lead', to }],
    })
  }
  return out
}

function waitingBadge(daysWaiting: number) {
  return daysWaiting <= 0 ? 'Requested today' : `Waiting ${plural(daysWaiting, 'day')}`
}

export function approvalWorkItems(requests: MembershipApprovalRequest[], asOf: Date = new Date()): DailyWorkItem[] {
  return requests
    .filter((r) => r.status === 'Pending')
    .map((r) => {
      const waited = Math.max(-(daysUntilTimestamp(r.requestedDate, asOf) ?? 0), 0)
      return {
        key: `approval-${r.id}`,
        kind: 'approval' as const,
        bucket: 'overdue' as const,
        title: memberName(r.memberName, r.memberId),
        titleTo: memberProfilePath(r.memberId),
        detail: `${r.requestType} request awaiting approval${r.requestedByName ? ` · by ${r.requestedByName}` : ''}`,
        badge: waitingBadge(waited),
        urgency: -waited,
        actions: [{ kind: 'link' as const, label: 'Review request', to: '/dashboard/payments/membership-approvals' }],
      }
    })
}

export function waiveOffWorkItems(requests: WaiveOffRequest[], asOf: Date = new Date()): DailyWorkItem[] {
  return requests
    .filter((r) => r.status === 'Pending')
    .map((r) => {
      const waited = Math.max(-(daysUntilTimestamp(r.requestedDate, asOf) ?? 0), 0)
      return {
        key: `waive-off-${r.id}`,
        kind: 'waive-off' as const,
        bucket: 'overdue' as const,
        title: memberName(r.memberName, r.userId),
        titleTo: memberProfilePath(r.userId),
        detail: `Waive-off of ${formatInr(r.requestedAmount)} awaiting approval`,
        badge: waitingBadge(waited),
        urgency: -waited,
        actions: [{ kind: 'link' as const, label: 'Review waive-off', to: '/dashboard/payments/waive-offs' }],
      }
    })
}

const KIND_PRIORITY: Record<DailyWorkKind, number> = {
  payment: 0,
  renewal: 1,
  approval: 2,
  'waive-off': 3,
  lead: 4,
}

/** Overdue before upcoming; then most overdue / soonest due; ties by kind. */
export function sortDailyWork(items: DailyWorkItem[]): DailyWorkItem[] {
  return [...items].sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket === 'overdue' ? -1 : 1
    if (a.urgency !== b.urgency) return a.urgency - b.urgency
    return KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]
  })
}
