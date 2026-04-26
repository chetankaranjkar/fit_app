import { useMemo, useState } from 'react'
import { DrawerSection } from '../AnalyticsDrawer'
import { MiniSparkline } from '../MiniSparkline'
import { EmptyState } from '../EmptyState'
import { IconActivity, IconCalendar } from '../Icons'
import { KPI_SNAPSHOT, MOCK_PAYMENTS, MOCK_REVENUE_30D } from '../../services/mockData'
import type { PaymentEntry, PaymentStatus, RevenueRange } from '../../types'

const inr = (n: number) => `\u20b9${n.toLocaleString('en-IN')}`
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })

const statusTone: Record<PaymentStatus, string> = {
  PAID: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25',
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-400/25',
  OVERDUE: 'bg-rose-500/10 text-rose-300 border-rose-400/25',
  REFUNDED: 'bg-slate-500/10 text-slate-300 border-slate-400/25',
}

export function RevenueDrawerBody() {
  const [range, setRange] = useState<RevenueRange>('7d')

  const series = useMemo(() => {
    const slice = range === '7d' ? MOCK_REVENUE_30D.slice(-7) : MOCK_REVENUE_30D
    return slice
  }, [range])

  const total = useMemo(
    () => series.reduce((sum, p) => sum + p.amount, 0),
    [series],
  )

  const sortedPayments = useMemo<PaymentEntry[]>(
    () =>
      [...MOCK_PAYMENTS].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [],
  )

  // Simple weekly aggregation for the breakdown chip row.
  const weekly = useMemo(() => {
    const buckets: Record<string, number> = {}
    for (const p of MOCK_REVENUE_30D) {
      const d = new Date(p.date)
      // ISO week key (year-week)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      buckets[key] = (buckets[key] ?? 0) + p.amount
    }
    return Object.entries(buckets).slice(-4)
  }, [])

  return (
    <>
      <DrawerSection
        title="Trend"
        action={
          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-0.5 text-[11px] font-semibold">
            {(['7d', '30d'] as RevenueRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={[
                  'rounded-lg px-3 py-1 transition',
                  r === range
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                {r === '7d' ? 'Last 7 days' : 'Last 30 days'}
              </button>
            ))}
          </div>
        }
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-400">
                {range === '7d' ? 'Last 7 days' : 'Last 30 days'}
              </p>
              <p className="mt-1 text-2xl font-bold text-white">{inr(total)}</p>
            </div>
            <p className="text-[11px] text-slate-500">
              Avg&nbsp;
              <span className="text-slate-300">
                {inr(Math.round(total / Math.max(1, series.length)))}
              </span>
              &nbsp;/ day
            </p>
          </div>
          <div className="mt-3 h-32">
            <MiniSparkline data={series} />
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Weekly breakdown">
        <div className="grid grid-cols-2 gap-2">
          {weekly.map(([week, amount]) => (
            <div
              key={week}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
            >
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <IconCalendar className="size-3.5" />
                <span>Week of {fmtDate(week)}</span>
              </div>
              <span className="text-sm font-semibold text-white">{inr(amount)}</span>
            </div>
          ))}
        </div>
      </DrawerSection>

      <DrawerSection title="Recent payments">
        {sortedPayments.length === 0 ? (
          <EmptyState
            icon={<IconActivity className="size-5" />}
            title="No recent payments"
            message="Payments will appear here as soon as they're recorded."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <ul className="divide-y divide-white/5">
              {sortedPayments.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-[11px] font-bold text-white">
                    {p.memberName
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {p.memberName}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {p.plan ?? '—'} · {fmtDate(p.date)} · {fmtTime(p.date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-white">{inr(p.amount)}</p>
                    <span
                      className={[
                        'mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                        statusTone[p.status],
                      ].join(' ')}
                    >
                      {p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DrawerSection>
    </>
  )
}

/**
 * Header summary strip used for the Revenue drawer \u2014 highlights week-over-week delta.
 */
export function RevenueDrawerSummary() {
  const { last7d, deltaPct } = KPI_SNAPSHOT.revenue
  const up = deltaPct >= 0
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
      <span className="text-slate-400">
        Revenue last 7 days&nbsp;
        <span className="font-semibold text-white">{`\u20b9${last7d.toLocaleString('en-IN')}`}</span>
      </span>
      <span
        className={[
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold',
          up
            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-400/25 bg-rose-500/10 text-rose-300',
        ].join(' ')}
      >
        {up ? '\u2191' : '\u2193'} {Math.abs(deltaPct)}%
      </span>
    </div>
  )
}
