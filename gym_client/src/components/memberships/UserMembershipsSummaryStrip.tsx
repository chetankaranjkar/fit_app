import type { ReactNode } from 'react'
import type { UserMembershipQuickFilter } from '../../lib/userMembershipListUtils'
import type { UserMembershipSummary } from '../../types/userMembership'

type KpiTile = {
  id: string
  label: string
  hint: string
  value: number | undefined
  quickFilter?: UserMembershipQuickFilter
  tone: 'blue' | 'emerald' | 'violet' | 'amber' | 'yellow' | 'slate'
  icon: ReactNode
}

const TONE_CLASS: Record<KpiTile['tone'], { border: string; glow: string; icon: string; value: string }> = {
  blue: {
    border: 'border-blue-400/20',
    glow: 'from-blue-500/12 via-transparent to-indigo-600/8',
    icon: 'bg-blue-500/20 text-blue-200 ring-blue-400/25',
    value: 'text-white',
  },
  emerald: {
    border: 'border-emerald-400/20',
    glow: 'from-emerald-500/12 via-transparent to-teal-600/8',
    icon: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/25',
    value: 'text-emerald-300',
  },
  violet: {
    border: 'border-violet-400/20',
    glow: 'from-violet-500/12 via-transparent to-purple-600/8',
    icon: 'bg-violet-500/20 text-violet-200 ring-violet-400/25',
    value: 'text-violet-200',
  },
  amber: {
    border: 'border-amber-400/20',
    glow: 'from-amber-500/12 via-transparent to-orange-600/8',
    icon: 'bg-amber-500/20 text-amber-200 ring-amber-400/25',
    value: 'text-amber-200',
  },
  yellow: {
    border: 'border-yellow-400/20',
    glow: 'from-yellow-500/12 via-transparent to-amber-600/8',
    icon: 'bg-yellow-500/15 text-yellow-200 ring-yellow-400/25',
    value: 'text-yellow-200',
  },
  slate: {
    border: 'border-slate-400/15',
    glow: 'from-slate-500/10 via-transparent to-slate-700/8',
    icon: 'bg-slate-500/20 text-slate-200 ring-slate-400/20',
    value: 'text-slate-200',
  },
}

function KpiCell({
  tile,
  isLoading,
  active,
  onSelect,
}: {
  tile: KpiTile
  isLoading: boolean
  active: boolean
  onSelect?: () => void
}) {
  const tone = TONE_CLASS[tile.tone]
  const display = isLoading ? '…' : (tile.value ?? 0).toLocaleString()
  const clickable = Boolean(onSelect)

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onSelect}
      className={[
        'group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left',
        'bg-[#0a101c]/85 backdrop-blur-xl transition-all duration-200',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_4px_20px_-10px_rgba(0,0,0,0.6)]',
        tone.border,
        clickable ? 'cursor-pointer hover:-translate-y-px hover:border-white/25' : 'cursor-default',
        active ? 'ring-1 ring-blue-400/40 ring-offset-1 ring-offset-[#070b14]' : '',
      ].join(' ')}
      aria-pressed={active}
    >
      <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`} />
      <div
        className={`relative flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ${tone.icon}`}
      >
        {tile.icon}
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {tile.label}
        </p>
        <p className={`mt-0.5 text-xl font-bold leading-none tabular-nums ${tone.value}`}>{display}</p>
        <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{tile.hint}</p>
      </div>
    </button>
  )
}

const icons = {
  total: (
    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  active: (
    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  paymentDue: (
    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  expiring: (
    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  voidPending: (
    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  expired: (
    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

type UserMembershipsSummaryStripProps = {
  summary: UserMembershipSummary | undefined
  matchingCount: number
  isLoading: boolean
  filteredView: boolean
  quickFilter: UserMembershipQuickFilter
  onQuickFilterChange: (value: UserMembershipQuickFilter) => void
}

export function UserMembershipsSummaryStrip({
  summary,
  matchingCount,
  isLoading,
  filteredView,
  quickFilter,
  onQuickFilterChange,
}: UserMembershipsSummaryStripProps) {
  const tiles: KpiTile[] = [
    {
      id: 'operational',
      label: 'Operational',
      hint: filteredView ? `${matchingCount.toLocaleString()} matching filter` : 'All active registry rows',
      value: summary?.total,
      quickFilter: 'all',
      tone: 'blue',
      icon: icons.total,
    },
    {
      id: 'active',
      label: 'Active',
      hint: 'Currently valid',
      value: summary?.active,
      tone: 'emerald',
      icon: icons.active,
    },
    {
      id: 'paymentDue',
      label: 'Payment due',
      hint: 'Balance or pending pay',
      value: summary?.paymentDue,
      quickFilter: 'needsPayment',
      tone: 'violet',
      icon: icons.paymentDue,
    },
    {
      id: 'expiring',
      label: 'Expiring 14d',
      hint: 'Ending within 2 weeks',
      value: summary?.expiring14d,
      quickFilter: 'expiring14',
      tone: 'amber',
      icon: icons.expiring,
    },
    {
      id: 'voidPending',
      label: 'Void pending',
      hint: 'Awaiting approval',
      value: summary?.voidPending,
      quickFilter: 'voidPending',
      tone: 'yellow',
      icon: icons.voidPending,
    },
    {
      id: 'expired',
      label: 'Expired',
      hint: 'Renew to restore access',
      value: summary?.expired,
      quickFilter: 'expired',
      tone: 'slate',
      icon: icons.expired,
    },
  ]

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      aria-label="Membership summary"
    >
      {tiles.map((tile) => (
        <KpiCell
          key={tile.id}
          tile={tile}
          isLoading={isLoading}
          active={tile.quickFilter != null && quickFilter === tile.quickFilter}
          onSelect={
            tile.quickFilter
              ? () => onQuickFilterChange(tile.quickFilter === quickFilter ? 'all' : tile.quickFilter!)
              : undefined
          }
        />
      ))}
    </div>
  )
}
