import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { authService } from '../../services/auth.service'
import { DataPageSection, DataPageShell } from '../../components/layout/DataPageShell'
import { DataToolbar } from '../../components/data-grid'
import { Input } from '../../components/ui/Input'
import {
  workoutPlanAuditActionLabels,
  workoutPlanAuditService,
  type WorkoutPlanAuditAction,
} from '../../services/workoutPlanAudit.service'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

const actionOptions: { value: '' | WorkoutPlanAuditAction; label: string }[] = [
  { value: '', label: 'All actions' },
  ...(
    Object.entries(workoutPlanAuditActionLabels) as [WorkoutPlanAuditAction, string][]
  ).map(([value, label]) => ({ value, label })),
]

function formatWhen(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

export function WorkoutPlanAuditPage() {
  if (!authService.canViewWorkoutPlanAudit()) {
    return <Navigate to="/dashboard" replace />
  }

  const { userName } = getDashboardUser()
  const [memberUserId, setMemberUserId] = useState('')
  const [actionFilter, setActionFilter] = useState<'' | WorkoutPlanAuditAction>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const queryParams = useMemo(() => {
    const memberId = memberUserId.trim() ? Number(memberUserId) : undefined
    return {
      memberUserId: memberId && memberId > 0 ? memberId : undefined,
      action: actionFilter || undefined,
      fromUtc: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
      toUtc: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
      take: 200,
    }
  }, [memberUserId, actionFilter, fromDate, toDate])

  const { data: logs = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['workout-plan-audit', queryParams],
    queryFn: () => workoutPlanAuditService.list(queryParams),
  })

  return (
    <DashboardLayout userName={userName} pageTitle="Workout plan audit">
      <DataPageShell>
        <DataPageSection
          title="Personal workout plan audit"
          description="Immutable history for personal plan create, update, exercise changes, and audited deletes. Program templates are unchanged."
        >
          <DataToolbar className="mb-4 flex-wrap gap-3">
            <Input
              label="Member user ID"
              type="number"
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              className="w-40"
            />
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Action type
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as '' | WorkoutPlanAuditAction)}
                className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
              >
                {actionOptions.map((o) => (
                  <option className="bg-slate-900 text-slate-100" key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 rounded-lg border border-white/10 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/30"
            >
              Refresh
            </button>
          </DataToolbar>

          {isLoading || isFetching ? (
            <p className="text-sm text-slate-400">Loading audit history…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400">No audit records match these filters.</p>
          ) : (
            <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white">
                      {workoutPlanAuditActionLabels[log.action] ?? log.action}
                    </span>
                    <span className="text-xs text-slate-500">#{log.id}</span>
                  </div>
                  <p className="mt-1 text-slate-200">{log.workoutPlanName}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatWhen(log.performedDate)} · {log.performedByUserName || `User #${log.performedByUserId}`}
                    {log.assignedToUserName
                      ? ` · Member: ${log.assignedToUserName}`
                      : log.assignedToUserId
                        ? ` · Member #${log.assignedToUserId}`
                        : ''}
                  </p>
                  {log.changeDetails && (
                    <p className="mt-2 text-xs text-slate-500">{log.changeDetails}</p>
                  )}
                  {log.action === 'Deleted' && log.snapshotJson && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-violet-300">
                        View deletion snapshot JSON
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded bg-black/40 p-2 text-[10px] text-slate-400">
                        {log.snapshotJson}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DataPageSection>
      </DataPageShell>
    </DashboardLayout>
  )
}
