import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { userMembershipsService } from '../../services/userMemberships.service'
import { RENEWAL_QUEUE_QUERY_KEY } from '../../lib/dashboardQueryKeys'
import { collectPaymentPath, memberMembershipHistoryPath } from '../../lib/membershipPaymentNavigation'
import { formatInr } from '../../lib/formatInr'
import type { ExpiringMembershipQueueItem } from '../../types/userMembership'

const QUEUE_WITHIN_DAYS = 14
const PREVIEW_SIZE = 6

function formatEndDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function timelineLabel(item: ExpiringMembershipQueueItem) {
  if (item.isExpired) {
    const daysAgo = Math.abs(item.daysRemaining)
    if (daysAgo === 0) return 'Expired today'
    if (daysAgo === 1) return 'Expired 1d ago'
    return `Expired ${daysAgo}d ago`
  }
  if (item.daysRemaining <= 0) return 'Ends today'
  if (item.daysRemaining === 1) return '1 day left'
  return `${item.daysRemaining} days left`
}

type UserMembershipRenewalFocusStripProps = {
  returnTo: string
  onOpenExpiringFilter: () => void
  onRenewItem: (item: ExpiringMembershipQueueItem) => void
}

export function UserMembershipRenewalFocusStrip({
  returnTo,
  onOpenExpiringFilter,
  onRenewItem,
}: UserMembershipRenewalFocusStripProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: [...RENEWAL_QUEUE_QUERY_KEY, 'focus', QUEUE_WITHIN_DAYS],
    queryFn: () =>
      userMembershipsService.getExpiringQueue({
        withinDays: QUEUE_WITHIN_DAYS,
        page: 1,
        pageSize: PREVIEW_SIZE,
      }),
    staleTime: 30_000,
  })

  const items = data?.items ?? []
  const total = data?.totalCount ?? 0
  const needsCollect = (item: ExpiringMembershipQueueItem) => !item.isFullyPaid && item.pendingAmount > 0.02

  if (isLoading) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
        Loading renewal focus…
      </section>
    )
  }

  if (total === 0) return null

  return (
    <section className="rounded-xl border border-violet-400/20 bg-violet-500/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Renewal focus</h2>
          <p className="text-xs text-slate-400">
            {total} member{total === 1 ? '' : 's'} expiring within {QUEUE_WITHIN_DAYS} days or recently expired
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button
            type="button"
            onClick={onOpenExpiringFilter}
            className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100 hover:bg-blue-500/20"
          >
            View all expiring
          </button>
        </div>
      </div>

      {!collapsed ? (
        <ul className="divide-y divide-white/5 px-4">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link
                  to={memberMembershipHistoryPath(item.userId)}
                  className="truncate text-sm font-medium text-white hover:text-violet-200"
                >
                  {item.userName?.trim() || `Member #${item.userId}`}
                </Link>
                <p className="mt-0.5 text-xs text-slate-400">
                  {item.planName ?? 'Plan'} · ends {formatEndDate(item.endDate)}
                  {item.isFullyPaid ? ' · fully paid' : item.pendingAmount > 0.02 ? ` · ${formatInr(item.pendingAmount)} due` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-300">{timelineLabel(item)}</span>
              <div className="flex shrink-0 gap-2">
                {needsCollect(item) ? (
                  <button
                    type="button"
                    onClick={() => navigate(collectPaymentPath(item.id, item.userId, returnTo))}
                    className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
                  >
                    Collect
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRenewItem(item)}
                  className="rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/20"
                >
                  Renew
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
