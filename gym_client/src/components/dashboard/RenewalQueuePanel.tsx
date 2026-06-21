import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from './premium/GlassPanel'
import { MemberMembershipsModal } from '../users/MemberMembershipsModal'
import { userMembershipsService } from '../../services/userMemberships.service'
import { usersService } from '../../services/users.service'
import { RENEWAL_QUEUE_QUERY_KEY } from '../../lib/dashboardQueryKeys'
import { collectPaymentPath, memberProfilePath } from '../../lib/membershipPaymentNavigation'
import type { ExpiringMembershipQueueItem } from '../../types/userMembership'
import type { User } from '../../types/user'

const QUEUE_WITHIN_DAYS = 14
const QUEUE_PAGE_SIZE = 12

function formatEndDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLabel(days: number) {
  if (days <= 0) return 'Ends today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

function urgencyClass(days: number) {
  if (days <= 3) return 'border-rose-500/35 bg-rose-500/10 text-rose-100'
  if (days <= 7) return 'border-amber-500/35 bg-amber-500/10 text-amber-100'
  return 'border-white/10 bg-white/5 text-slate-300'
}

function statusChip(status: ExpiringMembershipQueueItem['status']) {
  if (status === 'PartialPayment' || status === 'ActivePendingPayment') {
    return (
      <span className="rounded-md border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200">
        Payment due
      </span>
    )
  }
  return null
}

export function RenewalQueuePanel({ enabled }: { enabled: boolean }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [membershipUser, setMembershipUser] = useState<User | null>(null)
  const [membershipModalOpen, setMembershipModalOpen] = useState(false)
  const [openingUserId, setOpeningUserId] = useState<number | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [...RENEWAL_QUEUE_QUERY_KEY, QUEUE_WITHIN_DAYS, search],
    queryFn: () =>
      userMembershipsService.getExpiringQueue({
        withinDays: QUEUE_WITHIN_DAYS,
        page: 1,
        pageSize: QUEUE_PAGE_SIZE,
        search: search.trim() || undefined,
      }),
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const openMemberships = useCallback(async (item: ExpiringMembershipQueueItem) => {
    if (openingUserId != null) return
    setOpeningUserId(item.userId)
    try {
      const { data: user } = await usersService.getById(item.userId)
      setMembershipUser(user)
      setMembershipModalOpen(true)
    } finally {
      setOpeningUserId(null)
    }
  }, [openingUserId])

  const collectPayment = useCallback(
    (item: ExpiringMembershipQueueItem) => {
      navigate(collectPaymentPath(item.id, item.userId, memberProfilePath(item.userId)))
    },
    [navigate],
  )

  const items = data?.items ?? []
  const total = data?.totalCount ?? 0

  return (
    <>
      <GlassPanel
        role="admin"
        title="Renewal queue"
        subtitle={`Plans ending in the next ${QUEUE_WITHIN_DAYS} days — renew before members hit the QR gate`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, plan…"
              className="w-44 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 sm:w-52"
              aria-label="Search renewal queue"
            />
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        }
        className="lg:col-span-3"
      >
        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading renewal queue…</p>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-rose-300">Could not load renewal queue.</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No memberships expiring in the next {QUEUE_WITHIN_DAYS} days.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-400">
              {total} member{total === 1 ? '' : 's'} in queue
              {total > items.length ? ` · showing ${items.length}` : ''}
            </p>
            <ul className="divide-y divide-white/5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/dashboard/users/${item.userId}?mode=view&tab=membership`}
                        className="truncate text-sm font-medium text-white hover:text-violet-200"
                      >
                        {item.userName?.trim() || `Member #${item.userId}`}
                      </Link>
                      {statusChip(item.status)}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {item.planName ?? 'Plan'} · ends {formatEndDate(item.endDate)}
                      {item.memberPhone ? ` · ${item.memberPhone}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium ${urgencyClass(item.daysRemaining)}`}
                  >
                    {daysLabel(item.daysRemaining)}
                  </span>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => collectPayment(item)}
                      className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
                    >
                      Collect
                    </button>
                    <button
                      type="button"
                      onClick={() => void openMemberships(item)}
                      disabled={openingUserId === item.userId}
                      className="rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/20 disabled:opacity-50"
                    >
                      {openingUserId === item.userId ? 'Opening…' : 'Renew'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {total > QUEUE_PAGE_SIZE ? (
              <Link
                to="/dashboard/user-memberships"
                className="mt-4 inline-block text-xs text-blue-400 hover:underline"
              >
                View all memberships →
              </Link>
            ) : null}
          </>
        )}
      </GlassPanel>

      <MemberMembershipsModal
        user={membershipUser}
        open={membershipModalOpen}
        onClose={() => {
          setMembershipModalOpen(false)
          setMembershipUser(null)
        }}
      />
    </>
  )
}
