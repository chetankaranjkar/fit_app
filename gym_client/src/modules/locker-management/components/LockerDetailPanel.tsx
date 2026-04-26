import { useMemo } from 'react'
import { Button } from '../../../components/ui/Button'
import { SidePanel } from './SidePanel'
import { LockerStatusBadge } from './LockerStatusBadge'
import {
  IconAlert,
  IconCalendar,
  IconClock,
  IconEdit,
  IconLock,
  IconTrash,
  IconUnlock,
  IconUser,
  IconWrench,
} from './Icons'
import {
  useAccessLogs,
  useAssignments,
  useDeleteLocker,
  useMaintenance,
} from '../hooks/useLockerManagement'
import { daysUntil, formatDate, formatDateTime, isExpired } from '../utils/format'
import type { Locker } from '../types'

export function LockerDetailPanel({
  locker,
  onClose,
  onEdit,
}: {
  locker: Locker | null
  onClose: () => void
  onEdit: (locker: Locker) => void
}) {
  const { data: assignments = [] } = useAssignments()
  const { data: accessLogs = [] } = useAccessLogs()
  const { data: maintenance = [] } = useMaintenance()
  const deleteMut = useDeleteLocker()

  const current = useMemo(() => {
    if (!locker) return null
    return (
      assignments
        .filter((a) => a.lockerId === locker.id)
        .sort(
          (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime(),
        )[0] ?? null
    )
  }, [assignments, locker])

  const recentLogs = useMemo(() => {
    if (!locker) return []
    return accessLogs
      .filter((l) => l.lockerId === locker.id)
      .sort((a, b) => new Date(b.accessTime).getTime() - new Date(a.accessTime).getTime())
      .slice(0, 5)
  }, [accessLogs, locker])

  const tickets = useMemo(() => {
    if (!locker) return []
    return maintenance
      .filter((m) => m.lockerId === locker.id)
      .sort(
        (a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime(),
      )
      .slice(0, 3)
  }, [maintenance, locker])

  const handleDelete = () => {
    if (!locker) return
    if (!window.confirm(`Delete locker ${locker.lockerNumber}? This cannot be undone.`)) return
    deleteMut.mutate(locker.id, { onSuccess: onClose })
  }

  if (!locker) return null

  return (
    <SidePanel
      open={!!locker}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Locker
          </span>
          {locker.lockerNumber}
        </span>
      }
      subtitle={
        <span className="flex items-center gap-2">
          <span>{locker.size}</span>
          {locker.location && <span className="text-slate-600">&middot;</span>}
          {locker.location && <span>{locker.location}</span>}
        </span>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-rose-300 hover:text-rose-200">
            <IconTrash className="size-3.5" />
            Delete
          </Button>
          <Button size="sm" onClick={() => onEdit(locker)}>
            <IconEdit className="size-3.5" />
            Edit locker
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Status block */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Current status
            </span>
            <LockerStatusBadge status={locker.status} />
          </div>
        </div>

        {/* Current assignment */}
        <Section title="Current assignment" icon={<IconUser className="size-3.5" />}>
          {current ? (
            <AssignmentCard
              memberName={current.memberName}
              assignedDate={current.assignedDate}
              expiryDate={current.expiryDate}
            />
          ) : (
            <EmptyLine text="No active assignment" />
          )}
        </Section>

        {/* Recent activity */}
        <Section
          title="Recent activity"
          icon={<IconClock className="size-3.5" />}
          hint={recentLogs.length > 0 ? `${recentLogs.length} latest` : undefined}
        >
          {recentLogs.length === 0 ? (
            <EmptyLine text="No access logs yet" />
          ) : (
            <ul className="space-y-2">
              {recentLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <span
                    className={[
                      'flex size-7 shrink-0 items-center justify-center rounded-lg',
                      log.action === 'OPEN'
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : 'bg-slate-500/15 text-slate-300',
                    ].join(' ')}
                  >
                    {log.action === 'OPEN' ? (
                      <IconUnlock className="size-3.5" />
                    ) : (
                      <IconLock className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {log.memberName}{' '}
                      <span className="font-normal text-slate-400">
                        {log.action === 'OPEN' ? 'opened' : 'closed'}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {formatDateTime(log.accessTime)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Maintenance tickets */}
        <Section title="Maintenance" icon={<IconWrench className="size-3.5" />}>
          {tickets.length === 0 ? (
            <EmptyLine text="No tickets logged" />
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className={[
                    'rounded-xl border p-3',
                    t.status === 'PENDING'
                      ? 'border-amber-400/25 bg-amber-500/[0.06]'
                      : 'border-emerald-400/20 bg-emerald-500/[0.05]',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white">{t.issue}</p>
                    <span
                      className={[
                        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        t.status === 'PENDING'
                          ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                          : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
                      ].join(' ')}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Reported {formatDate(t.reportedDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </SidePanel>
  )
}

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string
  icon?: React.ReactNode
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <span className="text-slate-500">{icon}</span>
          {title}
        </h3>
        {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-center text-xs text-slate-500">
      {text}
    </p>
  )
}

function AssignmentCard({
  memberName,
  assignedDate,
  expiryDate,
}: {
  memberName: string
  assignedDate: string
  expiryDate: string
}) {
  const expired = isExpired(expiryDate)
  const days = daysUntil(expiryDate)
  const urgent = !expired && days <= 7

  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border p-4',
        expired
          ? 'border-rose-400/30 bg-rose-500/[0.06]'
          : urgent
            ? 'border-amber-400/25 bg-amber-500/[0.05]'
            : 'border-white/10 bg-white/[0.02]',
      ].join(' ')}
    >
      {expired && (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-200">
          <IconAlert className="size-3" />
          Expired
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-base font-semibold text-white">
          {memberName
            .split(' ')
            .slice(0, 2)
            .map((p) => p[0])
            .join('')
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{memberName}</p>
          <p className="text-[11px] text-slate-500">Assigned member</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniKV
          icon={<IconCalendar className="size-3" />}
          label="Assigned"
          value={formatDate(assignedDate)}
        />
        <MiniKV
          icon={<IconCalendar className="size-3" />}
          label={expired ? 'Expired' : 'Expires'}
          value={formatDate(expiryDate)}
          accent={expired ? 'danger' : urgent ? 'warn' : 'default'}
          sub={
            expired
              ? `${Math.abs(days)}d ago`
              : days === 0
                ? 'today'
                : `in ${days}d`
          }
        />
      </div>
    </div>
  )
}

function MiniKV({
  icon,
  label,
  value,
  sub,
  accent = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: 'default' | 'warn' | 'danger'
}) {
  const valueCls =
    accent === 'danger'
      ? 'text-rose-300'
      : accent === 'warn'
        ? 'text-amber-200'
        : 'text-white'
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${valueCls}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  )
}
