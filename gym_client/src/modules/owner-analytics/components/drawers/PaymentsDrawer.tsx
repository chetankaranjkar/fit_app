import { useMemo, useState } from 'react'
import { DrawerSection } from '../AnalyticsDrawer'
import { EmptyState } from '../EmptyState'
import { IconAlert, IconBell, IconInbox } from '../Icons'
import { KPI_SNAPSHOT, MOCK_PENDING } from '../../services/mockData'
import type { PendingDue } from '../../types'

const inr = (n: number) => `\u20b9${n.toLocaleString('en-IN')}`
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })

const isOverdue = (d: PendingDue) => new Date(d.dueDate).getTime() < Date.now()
const daysDiff = (iso: string) =>
  Math.ceil((Date.now() - new Date(iso).getTime()) / 86400000)

export function PaymentsDrawerBody() {
  const [sent, setSent] = useState<Record<string, boolean>>({})

  const sorted = useMemo(() => {
    return [...MOCK_PENDING].sort((a, b) => {
      const ao = isOverdue(a) ? 1 : 0
      const bo = isOverdue(b) ? 1 : 0
      if (ao !== bo) return bo - ao
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [])

  const overdueCount = sorted.filter(isOverdue).length
  const totalAmount = sorted.reduce((sum, d) => sum + d.dueAmount, 0)

  if (sorted.length === 0) {
    return (
      <DrawerSection title="All clear">
        <EmptyState
          icon={<IconInbox className="size-5" />}
          title="No pending payments"
          message="Nice! Every member is up to date."
        />
      </DrawerSection>
    )
  }

  return (
    <>
      <DrawerSection title="Overview">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-widest text-slate-400">
              Total pending
            </p>
            <p className="mt-1 text-xl font-bold text-white">{inr(totalAmount)}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {sorted.length} member{sorted.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-4">
            <p className="text-[11px] uppercase tracking-widest text-rose-300/80">
              Overdue
            </p>
            <p className="mt-1 text-xl font-bold text-rose-200">{overdueCount}</p>
            <p className="mt-1 text-[11px] text-rose-300/70">Needs follow-up</p>
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Pending dues">
        <ul className="space-y-2">
          {sorted.map((d) => {
            const overdue = isOverdue(d)
            const days = daysDiff(d.dueDate)
            const already = !!sent[d.id]
            return (
              <li
                key={d.id}
                className={[
                  'flex items-center gap-3 rounded-2xl border px-3 py-3 transition',
                  overdue
                    ? 'border-rose-400/20 bg-rose-500/[0.05] hover:border-rose-400/35'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                  'hover:bg-white/[0.05]',
                ].join(' ')}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f43f5e,#fb923c)] text-[11px] font-bold text-white">
                  {d.memberName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {d.memberName}
                    </p>
                    {overdue && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                        <IconAlert className="size-3" />
                        {days}d overdue
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-slate-400">
                    {d.plan ?? '—'} · Due {fmtDate(d.dueDate)}
                    {typeof d.remindersSent === 'number' && d.remindersSent > 0
                      ? ` \u00b7 ${d.remindersSent} reminder${d.remindersSent === 1 ? '' : 's'}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className={overdue ? 'text-sm font-bold text-rose-200' : 'text-sm font-semibold text-white'}>
                    {inr(d.dueAmount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent((s) => ({ ...s, [d.id]: true }))}
                    disabled={already}
                    className={[
                      'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition',
                      already
                        ? 'cursor-default border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-white/[0.04] text-slate-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] hover:text-white hover:shadow-md active:scale-95',
                    ].join(' ')}
                  >
                    <IconBell className="size-3" />
                    {already ? 'Sent' : 'Send reminder'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </DrawerSection>
    </>
  )
}

export function PaymentsDrawerSummary() {
  const { pendingAmount, pendingCount, overdueCount } = KPI_SNAPSHOT.payments
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
      <span className="text-slate-400">
        <span className="font-semibold text-white">
          {`\u20b9${pendingAmount.toLocaleString('en-IN')}`}
        </span>
        &nbsp;pending across&nbsp;
        <span className="font-semibold text-white">{pendingCount}</span>
        &nbsp;members
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-300">
        <IconAlert className="size-3" />
        {overdueCount} overdue
      </span>
    </div>
  )
}
