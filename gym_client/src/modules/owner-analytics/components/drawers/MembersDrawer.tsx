import { useMemo, useState } from 'react'
import { DrawerSection } from '../AnalyticsDrawer'
import { EmptyState } from '../EmptyState'
import { IconAlert, IconSearch, IconUsers } from '../Icons'
import { KPI_SNAPSHOT, MOCK_MEMBERS } from '../../services/mockData'
import type { ActiveMember, MembersFilter } from '../../types'

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const isInactive = (m: ActiveMember) => {
  const diffDays = (Date.now() - new Date(m.lastVisit).getTime()) / 86400000
  return m.status === 'INACTIVE' || diffDays > 7
}

export function MembersDrawerBody() {
  const [filter, setFilter] = useState<MembersFilter>('ALL')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_MEMBERS.filter((m) => {
      if (filter === 'ACTIVE' && isInactive(m)) return false
      if (filter === 'INACTIVE' && !isInactive(m)) return false
      if (q && !m.name.toLowerCase().includes(q) && !m.plan.toLowerCase().includes(q)) {
        return false
      }
      return true
    }).sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime())
  }, [filter, query])

  return (
    <>
      <DrawerSection
        title="Filters"
        action={
          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-0.5 text-[11px] font-semibold">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as MembersFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  'rounded-lg px-3 py-1 transition',
                  filter === f
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        }
      >
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-slate-200 focus-within:border-white/25 focus-within:bg-white/[0.04]">
          <IconSearch className="size-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or plan…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
        </label>
      </DrawerSection>

      <DrawerSection title={`${filtered.length} member${filtered.length === 1 ? '' : 's'}`}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<IconUsers className="size-5" />}
            title="No members match"
            message="Try clearing the filter or search."
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((m) => {
              const inactive = isInactive(m)
              return (
                <li
                  key={m.id}
                  className={[
                    'flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition',
                    inactive
                      ? 'border-amber-400/15 bg-amber-500/[0.04] hover:border-amber-400/30'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                    'hover:bg-white/[0.05]',
                  ].join(' ')}
                >
                  <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-[11px] font-bold text-white">
                    {m.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                    <span
                      className={[
                        'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[rgba(10,12,24,0.9)]',
                        inactive ? 'bg-amber-400' : 'bg-emerald-400',
                      ].join(' ')}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{m.name}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {m.plan} · Last visit {fmtRelative(m.lastVisit)}
                    </p>
                  </div>
                  {inactive && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      <IconAlert className="size-3" />
                      Inactive &gt;7d
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </DrawerSection>
    </>
  )
}

export function MembersDrawerSummary() {
  const { active, total, inactive } = KPI_SNAPSHOT.members
  const pct = total > 0 ? Math.round((active / total) * 100) : 0
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
      <span className="text-slate-400">
        <span className="font-semibold text-white">{active}</span>
        &nbsp;of&nbsp;
        <span className="font-semibold text-white">{total}</span>
        &nbsp;members active&nbsp;
        <span className="text-slate-500">({pct}%)</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-300">
        {inactive} inactive
      </span>
    </div>
  )
}
