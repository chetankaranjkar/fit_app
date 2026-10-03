import { useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ModulePageShell } from '../components/ModulePageShell'
import { useStaggerAnimation, useProgressAnimation } from '../hooks/useStaggerAnimation'
import {
  useCleaning,
  useCompleteCleaningShift,
  useUpdateCleaningTask,
} from '../hooks/useGymOperations'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { cleaningIsOverdue, cleaningIncomplete } from '../../../lib/opsWorkStatus'
import { formatDate } from '../utils/format'
import type { CleaningLog, CleaningShift, CleaningTask } from '../types'

const SHIFT_LABEL: Record<CleaningShift, { label: string; cls: string }> = {
  MORNING: { label: 'Morning', cls: 'from-amber-300 to-orange-500' },
  AFTERNOON: { label: 'Afternoon', cls: 'from-sky-400 to-blue-500' },
  EVENING: { label: 'Evening', cls: 'from-purple-500 to-pink-500' },
}

type CleaningView = 'ALL' | 'OVERDUE' | 'INCOMPLETE' | 'DONE'

export function CleaningPage() {
  const { data = [], isLoading } = useCleaning()
  const updateTask = useUpdateCleaningTask()
  const completeShift = useCompleteCleaningShift()
  const gridRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<CleaningView>(() => {
    const q = new URLSearchParams(window.location.search).get('view')
    return q === 'overdue' ? 'OVERDUE' : 'ALL'
  })

  const sorted = useMemo(() => {
    const list = [...data].sort((a, b) => {
      const aOver = cleaningIsOverdue(a) ? 0 : 1
      const bOver = cleaningIsOverdue(b) ? 0 : 1
      if (aOver !== bOver) return aOver - bOver
      const aInc = cleaningIncomplete(a.tasks) ? 0 : 1
      const bInc = cleaningIncomplete(b.tasks) ? 0 : 1
      if (aInc !== bInc) return aInc - bInc
      return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    })
    return list.filter((log) => {
      if (view === 'OVERDUE') return cleaningIsOverdue(log)
      if (view === 'INCOMPLETE') return cleaningIncomplete(log.tasks)
      if (view === 'DONE') return !cleaningIncomplete(log.tasks)
      return true
    })
  }, [data, view])

  const overall = useMemo(() => {
    const totals = data.reduce(
      (acc, log) => {
        acc.total += log.tasks.length
        acc.done += log.tasks.filter((t) => t.done).length
        if (cleaningIsOverdue(log)) acc.overdue += 1
        return acc
      },
      { total: 0, done: 0, overdue: 0 },
    )
    const percent = totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100)
    return { ...totals, percent }
  }, [data])

  useStaggerAnimation(gridRef, '[data-cleaning-card]', [sorted.length, isLoading])

  const handleToggle = (logId: string, task: CleaningTask) => {
    updateTask.mutate(
      { logId, taskId: task.id, isDone: !task.done },
      {
        onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update cleaning task')),
      },
    )
  }

  const handleComplete = (log: CleaningLog) => {
    completeShift.mutate(
      { logId: log.id, tasks: log.tasks },
      {
        onError: (err) => toast.error(getApiErrorMessage(err, 'Could not mark cleaning done')),
      },
    )
  }

  return (
    <ModulePageShell
      eyebrow="Gym Operations"
      titleBefore=""
      titleGradient="Cleaning & Hygiene"
      subtitle="Daily checklists across areas and shifts. Tick items as your team completes them — progress is saved to the cleaning log."
    >
      <div className="mt-6 space-y-6">
        <OverallProgress
          percent={overall.percent}
          done={overall.done}
          total={overall.total}
          overdue={overall.overdue}
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="cleaning-view">
            Cleaning filter
          </label>
          <select
            id="cleaning-view"
            aria-label="Cleaning filter"
            value={view}
            onChange={(e) => setView(e.target.value as CleaningView)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200"
          >
            <option value="ALL" className="bg-slate-900">
              All shifts
            </option>
            <option value="OVERDUE" className="bg-slate-900">
              Overdue incomplete
            </option>
            <option value="INCOMPLETE" className="bg-slate-900">
              Incomplete
            </option>
            <option value="DONE" className="bg-slate-900">
              Completed
            </option>
          </select>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((log) => (
            <CleaningCard
              key={log.id}
              log={log}
              onToggle={handleToggle}
              onComplete={() => handleComplete(log)}
              completing={completeShift.isPending}
            />
          ))}
        </div>
      </div>
    </ModulePageShell>
  )
}

function OverallProgress({
  percent,
  done,
  total,
  overdue,
}: {
  percent: number
  done: number
  total: number
  overdue: number
}) {
  const barRef = useRef<HTMLDivElement>(null)
  useProgressAnimation(barRef, percent)

  return (
    <div className="glass-card dashboard-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Today's cleaning progress
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {done} / {total} tasks completed
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {overdue} overdue shift{overdue === 1 ? '' : 's'}
          </p>
        </div>
        <div className="text-right">
          <p className="bg-[linear-gradient(135deg,#60a5fa,#c084fc)] bg-clip-text text-3xl font-bold text-transparent">
            {percent}%
          </p>
          <p className="text-xs text-slate-500">Overall completion</p>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          ref={barRef}
          style={{ width: '0%' }}
          className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7)]"
        />
      </div>
    </div>
  )
}

function CleaningCard({
  log,
  onToggle,
  onComplete,
  completing,
}: {
  log: CleaningLog & { tasks: CleaningTask[] }
  onToggle: (logId: string, task: CleaningTask) => void
  onComplete: () => void
  completing: boolean
}) {
  const done = log.tasks.filter((t) => t.done).length
  const percent = log.tasks.length === 0 ? 0 : Math.round((done / log.tasks.length) * 100)
  const shift = SHIFT_LABEL[log.shift]
  const overdue = cleaningIsOverdue(log)
  const incomplete = cleaningIncomplete(log.tasks)
  const barRef = useRef<HTMLDivElement>(null)
  useProgressAnimation(barRef, percent)

  return (
    <div
      data-cleaning-card
      data-testid="cleaning-card"
      data-overdue={overdue ? 'true' : 'false'}
      className={[
        'glass-card dashboard-card flex min-w-0 flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]',
        overdue ? 'border-rose-400/30' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{log.area}</p>
          <p className="text-[11px] text-slate-500">
            Due {formatDate(log.scheduledAt)} · {done} / {log.tasks.length} done
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400" data-testid="cleaning-assignee">
            {log.performedBy ? `Assigned: ${log.performedBy}` : 'Unassigned'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${shift.cls} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/95`}
          >
            {shift.label}
          </span>
          {overdue && (
            <span className="rounded-md border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
              Overdue
            </span>
          )}
          {!overdue && !incomplete && (
            <span className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              Complete
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          ref={barRef}
          style={{ width: '0%' }}
          className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#a855f7)]"
        />
      </div>

      <ul className="mt-4 space-y-2">
        {log.tasks.map((task) => (
          <li key={task.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.03]">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => onToggle(log.id, task)}
                className="sr-only"
              />
              <span
                className={[
                  'flex size-5 shrink-0 items-center justify-center rounded-md border transition',
                  task.done
                    ? 'border-emerald-400/40 bg-gradient-to-br from-emerald-400 to-teal-500'
                    : 'border-white/15 bg-white/5',
                ].join(' ')}
              >
                {task.done && (
                  <svg
                    className="size-3 text-slate-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </span>
              <span
                className={[
                  'text-sm transition',
                  task.done ? 'text-slate-500 line-through' : 'text-slate-200',
                ].join(' ')}
              >
                {task.label}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {incomplete && (
        <button
          type="button"
          onClick={onComplete}
          disabled={completing}
          className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          Mark shift complete
        </button>
      )}
    </div>
  )
}
