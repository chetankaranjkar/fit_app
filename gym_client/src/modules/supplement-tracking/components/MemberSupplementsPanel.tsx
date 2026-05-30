import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supplementTrackingService } from '../services/supplementTracking.service'
import { SupplementCard } from './SupplementCard'
import { MemberSupplementsTimeline } from './MemberSupplementsTimeline'
import { AssignSupplementModal } from './AssignSupplementModal'

interface Props {
  userId: number
  memberName?: string
  canManage?: boolean
  compact?: boolean
}

export function MemberSupplementsPanel({ userId, memberName, canManage = false, compact }: Props) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [tab, setTab] = useState<'active' | 'history'>('active')

  const { data: active = [], isLoading, refetch } = useQuery({
    queryKey: ['member-supplements', userId, 'active'],
    queryFn: async () => (await supplementTrackingService.getByUser(userId, true)).data,
    enabled: userId > 0,
  })

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['member-supplements', userId, 'history'],
    queryFn: async () => (await supplementTrackingService.getHistoryByUser(userId)).data,
    enabled: userId > 0 && tab === 'history',
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F5C400]/80">
            Supplement protocol
          </p>
          {!compact && (
            <p className="mt-1 text-sm text-slate-400">
              {active.length} active supplement{active.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/dashboard/users/${userId}/supplements`}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-[#F5C400]/40 hover:text-white"
          >
            Full view
          </Link>
          {canManage && (
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="rounded-xl bg-gradient-to-r from-[#F5C400] to-amber-500 px-4 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
            >
              + Assign
            </button>
          )}
        </div>
      </div>

      {!compact && (
        <div className="flex gap-2">
          {(['active', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                tab === t
                  ? 'bg-[#F5C400]/20 text-[#F5C400]'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {isLoading || (tab === 'history' && historyLoading) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-card h-40 animate-pulse rounded-2xl" />
          <div className="glass-card h-40 animate-pulse rounded-2xl" />
        </div>
      ) : tab === 'active' || compact ? (
        active.length === 0 ? (
          <div className="glass-card rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <p className="text-sm text-slate-400">No active supplements assigned.</p>
            {canManage && (
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="mt-3 text-sm font-semibold text-[#F5C400]"
              >
                Assign first supplement →
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
            {active.map((item) => (
              <SupplementCard key={item.id} item={item} />
            ))}
          </div>
        )
      ) : (
        <MemberSupplementsTimeline items={history} />
      )}

      <AssignSupplementModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        userId={userId}
        memberName={memberName}
        onAssigned={() => refetch()}
      />
    </section>
  )
}
