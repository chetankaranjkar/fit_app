import { useMemo } from 'react'
import { DrawerSection } from '../AnalyticsDrawer'
import { EmptyState } from '../EmptyState'
import { IconAlert, IconWrench } from '../Icons'
import { KPI_SNAPSHOT, MOCK_EQUIPMENT_ISSUES } from '../../services/mockData'
import type { EquipmentIssue, EquipmentStatus } from '../../types'

const daysDown = (e: EquipmentIssue) => {
  const end = e.resolvedDate ? new Date(e.resolvedDate) : new Date()
  return Math.max(
    0,
    Math.floor((end.getTime() - new Date(e.reportedDate).getTime()) / 86400000),
  )
}

const statusTone: Record<EquipmentStatus, string> = {
  OUT_OF_ORDER: 'bg-rose-500/10 text-rose-300 border-rose-400/25',
  UNDER_MAINTENANCE: 'bg-amber-500/10 text-amber-300 border-amber-400/25',
  RESOLVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25',
}

const statusLabel: Record<EquipmentStatus, string> = {
  OUT_OF_ORDER: 'Out of order',
  UNDER_MAINTENANCE: 'Under maintenance',
  RESOLVED: 'Resolved',
}

export function EquipmentDrawerBody() {
  const { unresolved, resolved } = useMemo(() => {
    const sorted = [...MOCK_EQUIPMENT_ISSUES].sort(
      (a, b) => daysDown(b) - daysDown(a),
    )
    return {
      unresolved: sorted.filter((e) => e.status !== 'RESOLVED'),
      resolved: sorted.filter((e) => e.status === 'RESOLVED'),
    }
  }, [])

  if (unresolved.length === 0 && resolved.length === 0) {
    return (
      <DrawerSection title="All equipment operational">
        <EmptyState
          icon={<IconWrench className="size-5" />}
          title="No reported issues"
          message="Every machine is running smoothly."
        />
      </DrawerSection>
    )
  }

  return (
    <>
      <DrawerSection title="Currently down">
        {unresolved.length === 0 ? (
          <EmptyState
            icon={<IconWrench className="size-5" />}
            title="All operational"
            message="No open equipment issues right now."
          />
        ) : (
          <ul className="space-y-2">
            {unresolved.map((e) => {
              const d = daysDown(e)
              const long = d >= 7
              return (
                <li
                  key={e.id}
                  className={[
                    'flex items-start gap-3 rounded-2xl border px-3 py-3 transition',
                    long
                      ? 'border-rose-400/25 bg-rose-500/[0.06] hover:border-rose-400/40'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                    'hover:bg-white/[0.05]',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex size-9 shrink-0 items-center justify-center rounded-xl',
                      long
                        ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-amber-500/15 text-amber-300',
                    ].join(' ')}
                  >
                    <IconWrench className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {e.equipmentName}
                      </p>
                      <span
                        className={[
                          'inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                          statusTone[e.status],
                        ].join(' ')}
                      >
                        {statusLabel[e.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {e.location ? `${e.location} \u00b7 ` : ''}
                      {e.issue}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-slate-300">
                        {d} day{d === 1 ? '' : 's'} down
                      </span>
                      {long && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-300">
                          <IconAlert className="size-3" />
                          Long downtime
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DrawerSection>

      {resolved.length > 0 && (
        <DrawerSection title="Recently resolved">
          <ul className="space-y-2">
            {resolved.slice(0, 4).map((e) => {
              const d = daysDown(e)
              return (
                <li
                  key={e.id}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3 transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <IconWrench className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {e.equipmentName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {e.issue}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-300/80">
                      Resolved after {d} day{d === 1 ? '' : 's'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </DrawerSection>
      )}
    </>
  )
}

export function EquipmentDrawerSummary() {
  const { downCount, longestDown, resolvedThisMonth } = KPI_SNAPSHOT.equipment
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
      <span className="text-slate-400">
        <span className="font-semibold text-white">{downCount}</span>
        &nbsp;items down · longest&nbsp;
        <span className="font-semibold text-white">{longestDown}d</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300">
        {resolvedThisMonth} resolved
      </span>
    </div>
  )
}
