import { useMemo, useRef, useState, useEffect } from 'react'
import { ModulePageShell } from '../components/ModulePageShell'
import { useStaggerAnimation, useProgressAnimation } from '../hooks/useStaggerAnimation'
import { useCleaning } from '../hooks/useGymOperations'
import type { CleaningLog, CleaningShift, CleaningTask } from '../types'

const SHIFT_LABEL: Record<CleaningShift, { label: string; cls: string }> = {
  MORNING: { label: 'Morning', cls: 'from-amber-300 to-orange-500' },
  AFTERNOON: { label: 'Afternoon', cls: 'from-sky-400 to-blue-500' },
  EVENING: { label: 'Evening', cls: 'from-purple-500 to-pink-500' },
}

export function CleaningPage() {
  const { data = [], isLoading } = useCleaning()
  const gridRef = useRef<HTMLDivElement>(null)

  const [localState, setLocalState] = useState<Record<string, CleaningTask[]>>({})

  useEffect(() => {
    if (!data.length) return
    setLocalState((prev) => {
      if (Object.keys(prev).length) return prev
      const init: Record<string, CleaningTask[]> = {}
      data.forEach((log) => {
        init[log.id] = log.tasks.map((t) => ({ ...t }))
      })
      return init
    })
  }, [data])

  const mergedLogs = useMemo(
    () =>
      data.map((log) => ({
        ...log,
        tasks: localState[log.id] ?? log.tasks,
      })),
    [data, localState],
  )

  const overall = useMemo(() => {
    const totals = mergedLogs.reduce(
      (acc, log) => {
        acc.total += log.tasks.length
        acc.done += log.tasks.filter((t) => t.done).length
        return acc
      },
      { total: 0, done: 0 },
    )
    const percent = totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100)
    return { ...totals, percent }
  }, [mergedLogs])

  useStaggerAnimation(gridRef, '[data-cleaning-card]', [
    mergedLogs.length,
    isLoading,
  ])

  const handleToggle = (logId: string, taskId: string) => {
    setLocalState((prev) => {
      const tasks = prev[logId] ?? []
      return {
        ...prev,
        [logId]: tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      }
    })
  }

  return (
    <ModulePageShell
      eyebrow="Gym Operations"
      titleBefore=""
      titleGradient="Cleaning & Hygiene"
      subtitle="Daily checklists across areas and shifts. Tick items as your team completes them."
    >
      <div className="mt-6 space-y-6">
        <OverallProgress percent={overall.percent} done={overall.done} total={overall.total} />

        <div ref={gridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mergedLogs.map((log) => (
            <CleaningCard key={log.id} log={log} onToggle={handleToggle} />
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
}: {
  percent: number
  done: number
  total: number
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
}: {
  log: CleaningLog & { tasks: CleaningTask[] }
  onToggle: (logId: string, taskId: string) => void
}) {
  const done = log.tasks.filter((t) => t.done).length
  const percent = log.tasks.length === 0 ? 0 : Math.round((done / log.tasks.length) * 100)
  const shift = SHIFT_LABEL[log.shift]
  const barRef = useRef<HTMLDivElement>(null)
  useProgressAnimation(barRef, percent)

  return (
    <div
      data-cleaning-card
      className="glass-card dashboard-card flex min-w-0 flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{log.area}</p>
          <p className="text-[11px] text-slate-500">
            {done} / {log.tasks.length} done
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${shift.cls} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/95`}
        >
          {shift.label}
        </span>
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
                onChange={() => onToggle(log.id, task.id)}
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

      {log.performedBy && (
        <p className="mt-4 border-t border-white/5 pt-3 text-[11px] text-slate-500">
          Signed off by <span className="text-slate-300">{log.performedBy}</span>
        </p>
      )}
    </div>
  )
}
