import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from './premium/GlassPanel'
import { MemberMembershipsModal } from '../users/MemberMembershipsModal'
import { useRenewalQueueQuery } from './useRenewalQueueQuery'
import { usersService } from '../../services/users.service'
import { userMembershipsService } from '../../services/userMemberships.service'
import { leadsService } from '../../services/leads.service'
import { membershipApprovalRequestsService } from '../../services/membershipApprovalRequests.service'
import { waiveOffRequestsService } from '../../services/waiveOffRequests.service'
import { isPathAllowedForRole, type DashboardRole } from '../../features/auth/roleRouting'
import { DAILY_WORK_QUERY_KEY } from '../../lib/dashboardQueryKeys'
import { getApiErrorMessage } from '../../lib/apiErrors'
import {
  approvalWorkItems,
  getDailyWorkAccess,
  leadFollowUpWorkItems,
  paymentWorkItems,
  renewalQueueWorkItems,
  sortDailyWork,
  waiveOffWorkItems,
  type DailyWorkAction,
  type DailyWorkBucket,
  type DailyWorkItem,
  type DailyWorkKind,
} from '../../lib/dailyWorkList'
import type { User } from '../../types/user'

const PAYMENTS_PAGE_SIZE = 100
const GROUP_PREVIEW = 8

const KIND_LABEL: Record<DailyWorkKind, string> = {
  payment: 'Payment',
  renewal: 'Renewal',
  lead: 'Lead',
  approval: 'Approval',
  'waive-off': 'Waive-off',
}

const queryOptions = { staleTime: 30_000, refetchInterval: 60_000, refetchOnWindowFocus: true } as const

function pathOf(to: string) {
  return to.split('?')[0]
}

function badgeClass(item: DailyWorkItem) {
  if (item.bucket === 'overdue') return 'border-rose-500/35 bg-rose-500/10 text-rose-100'
  if (item.urgency <= 1) return 'border-amber-500/35 bg-amber-500/10 text-amber-100'
  return 'border-white/10 bg-white/5 text-slate-300'
}

/** Drop links the persona's route guard would block (front desk prefixes). */
function restrictToRole(items: DailyWorkItem[], role: DashboardRole): DailyWorkItem[] {
  const out: DailyWorkItem[] = []
  for (const item of items) {
    const actions = item.actions.filter((a) => a.kind === 'renew' || isPathAllowedForRole(pathOf(a.to), role))
    if (actions.length === 0) continue
    const titleTo = item.titleTo && isPathAllowedForRole(pathOf(item.titleTo), role) ? item.titleTo : undefined
    out.push({ ...item, actions, titleTo })
  }
  return out
}

/**
 * Today's actionable queue built from existing APIs only. Each source is fetched only when the viewer
 * holds the permission its endpoint requires.
 */
export function DailyWorkListPanel({ role }: { role: DashboardRole }) {
  const access = useMemo(() => getDailyWorkAccess(), [])
  const canPayments = access.payments
  const canLeads = access.leads
  const canMembershipApprovals = access.membershipApprovals
  const canWaiveOffApprovals = access.waiveOffApprovals

  const [filter, setFilter] = useState<'all' | DailyWorkBucket>('all')
  const [expanded, setExpanded] = useState<Record<DailyWorkBucket, boolean>>({ overdue: false, upcoming: false })
  const [membershipUser, setMembershipUser] = useState<User | null>(null)
  const [openingUserId, setOpeningUserId] = useState<number | null>(null)
  const [renewError, setRenewError] = useState<string | null>(null)

  const renewalQ = useRenewalQueueQuery(canPayments)
  const paymentsQ = useQuery({
    queryKey: [...DAILY_WORK_QUERY_KEY, 'payments-due'],
    queryFn: () => userMembershipsService.getPaged({ page: 1, pageSize: PAYMENTS_PAGE_SIZE, needsPayment: true }),
    enabled: canPayments,
    ...queryOptions,
  })
  const leadsQ = useQuery({
    queryKey: [...DAILY_WORK_QUERY_KEY, 'leads'],
    queryFn: async () => (await leadsService.list()).data,
    enabled: canLeads,
    ...queryOptions,
  })
  const approvalsQ = useQuery({
    queryKey: [...DAILY_WORK_QUERY_KEY, 'membership-approvals'],
    queryFn: async () => (await membershipApprovalRequestsService.list('Pending')).data,
    enabled: canMembershipApprovals,
    ...queryOptions,
  })
  const waiveOffsQ = useQuery({
    queryKey: [...DAILY_WORK_QUERY_KEY, 'waive-offs'],
    queryFn: async () => (await waiveOffRequestsService.list('Pending')).data,
    enabled: canWaiveOffApprovals,
    ...queryOptions,
  })

  const items = useMemo(() => {
    const now = new Date()
    const renewals = renewalQ.data?.items ?? []
    const renewalIds = new Set(renewals.map((r) => r.id))
    return sortDailyWork(
      restrictToRole(
        [
          ...renewalQueueWorkItems(renewals),
          ...paymentWorkItems(paymentsQ.data?.items ?? [], renewalIds, now),
          ...leadFollowUpWorkItems(leadsQ.data ?? [], now),
          ...approvalWorkItems(approvalsQ.data ?? [], now),
          ...waiveOffWorkItems(waiveOffsQ.data ?? [], now),
        ],
        role,
      ),
    )
  }, [renewalQ.data, paymentsQ.data, leadsQ.data, approvalsQ.data, waiveOffsQ.data, role])

  const overdue = items.filter((i) => i.bucket === 'overdue')
  const upcoming = items.filter((i) => i.bucket === 'upcoming')

  const sources = [
    { enabled: canPayments, label: 'renewal queue', q: renewalQ },
    { enabled: canPayments, label: 'outstanding payments', q: paymentsQ },
    { enabled: canLeads, label: 'lead follow-ups', q: leadsQ },
    { enabled: canMembershipApprovals, label: 'membership approvals', q: approvalsQ },
    { enabled: canWaiveOffApprovals, label: 'waive-off requests', q: waiveOffsQ },
  ].filter((s) => s.enabled)
  const loading = sources.some((s) => s.q.isLoading)
  const errors = sources.filter((s) => s.q.isError)

  const renewalHidden = Math.max((renewalQ.data?.totalCount ?? 0) - (renewalQ.data?.items.length ?? 0), 0)
  const paymentsTruncated = (paymentsQ.data?.totalCount ?? 0) > (paymentsQ.data?.items.length ?? 0)

  const openRenew = useCallback(
    async (userId: number) => {
      if (openingUserId != null) return
      setOpeningUserId(userId)
      setRenewError(null)
      try {
        const { data: user } = await usersService.getById(userId)
        setMembershipUser(user)
      } catch (e) {
        setRenewError(getApiErrorMessage(e, 'Could not open memberships.'))
      } finally {
        setOpeningUserId(null)
      }
    },
    [openingUserId],
  )

  if (sources.length === 0) return null

  const renderAction = (item: DailyWorkItem, action: DailyWorkAction, primary: boolean) => {
    const cls = primary
      ? 'rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20'
      : 'rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/20 disabled:opacity-50'
    if (action.kind === 'renew') {
      return (
        <button
          key={`${item.key}-renew`}
          type="button"
          onClick={() => void openRenew(action.userId)}
          disabled={openingUserId === action.userId}
          className={cls}
        >
          {openingUserId === action.userId ? 'Opening…' : action.label}
        </button>
      )
    }
    return (
      <Link key={`${item.key}-${action.label}`} to={action.to} className={cls}>
        {action.label}
      </Link>
    )
  }

  const renderGroup = (bucket: DailyWorkBucket, list: DailyWorkItem[]) => {
    if (filter !== 'all' && filter !== bucket) return null
    const shown = expanded[bucket] ? list : list.slice(0, GROUP_PREVIEW)
    return (
      <div data-testid={`daily-work-group-${bucket}`}>
        <h4
          className={`mb-2 text-xs font-semibold uppercase tracking-wider ${
            bucket === 'overdue' ? 'text-rose-300' : 'text-amber-200/90'
          }`}
        >
          {bucket === 'overdue' ? 'Overdue' : 'Upcoming'} ({list.length})
        </h4>
        {list.length === 0 ? (
          <p className="py-3 text-sm text-slate-500">
            {bucket === 'overdue' ? 'Nothing overdue.' : 'Nothing due in the next few days.'}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {shown.map((item) => (
              <li
                key={item.key}
                data-testid="daily-work-item"
                data-key={item.key}
                data-kind={item.kind}
                data-bucket={item.bucket}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                      {KIND_LABEL[item.kind]}
                    </span>
                    {item.titleTo ? (
                      <Link to={item.titleTo} className="truncate text-sm font-medium text-white hover:text-violet-200">
                        {item.title}
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-medium text-white">{item.title}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{item.detail}</p>
                </div>
                <span
                  data-testid="daily-work-badge"
                  className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium ${badgeClass(item)}`}
                >
                  {item.badge}
                </span>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.actions.map((a, i) => renderAction(item, a, i === 0))}
                </div>
              </li>
            ))}
          </ul>
        )}
        {list.length > GROUP_PREVIEW ? (
          <button
            type="button"
            onClick={() => setExpanded((s) => ({ ...s, [bucket]: !s[bucket] }))}
            className="mt-2 text-xs text-blue-400 hover:underline"
          >
            {expanded[bucket] ? 'Show less' : `Show all ${list.length}`}
          </button>
        ) : null}
      </div>
    )
  }

  const filterButton = (value: 'all' | DailyWorkBucket, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={`rounded-lg border px-2.5 py-1.5 text-xs ${
        filter === value ? 'border-violet-400/40 bg-violet-500/15 text-violet-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
      }`}
    >
      {label} · {count}
    </button>
  )

  return (
    <>
      <GlassPanel
        role={role}
        title="Today's work"
        subtitle="Overdue first, then what is due soon — each item opens its existing workflow"
        action={
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter today's work">
            {filterButton('all', 'All', items.length)}
            {filterButton('overdue', 'Overdue', overdue.length)}
            {filterButton('upcoming', 'Upcoming', upcoming.length)}
          </div>
        }
        className="lg:col-span-3"
      >
        <div data-testid="daily-work-list" className="space-y-5">
          {loading && items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading today&apos;s work…</p>
          ) : (
            <>
              {renderGroup('overdue', overdue)}
              {renderGroup('upcoming', upcoming)}
            </>
          )}
          {errors.map((s) => (
            <p key={s.label} className="text-xs text-rose-300">
              Could not load {s.label}: {getApiErrorMessage(s.q.error)}
            </p>
          ))}
          {renewError ? <p className="text-xs text-rose-300">{renewError}</p> : null}
          {renewalHidden > 0 || paymentsTruncated ? (
            <p className="text-xs text-slate-500">
              {renewalHidden > 0 ? `${renewalHidden} more renewal${renewalHidden === 1 ? '' : 's'} in the Renewal queue below. ` : ''}
              {paymentsTruncated ? (
                <Link to="/dashboard/user-memberships" className="text-blue-400 hover:underline">
                  View all memberships with a balance →
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
      </GlassPanel>

      <MemberMembershipsModal
        user={membershipUser}
        open={membershipUser != null}
        onClose={() => setMembershipUser(null)}
      />
    </>
  )
}
