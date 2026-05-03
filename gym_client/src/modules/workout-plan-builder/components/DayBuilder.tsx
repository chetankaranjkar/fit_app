import { Copy, Moon, Sun } from 'lucide-react'
import type { BuilderDay, BuilderExercise } from '../types'

interface DayBuilderProps {
  days: BuilderDay[]
  activeDayId: number | null
  onSelectDay: (dayId: number) => void
  onRename: (dayId: number, name: string) => void
  onToggleRest: (dayId: number, isRestDay: boolean) => void
  onDuplicate: (day: BuilderDay) => void
  exercises?: BuilderExercise[]
}

export function DayBuilder({
  days,
  activeDayId,
  onSelectDay,
  onRename,
  onToggleRest,
  onDuplicate,
  exercises = [],
}: DayBuilderProps) {
  const countByDay = new Map<number, number>()
  exercises.forEach((exercise) => {
    countByDay.set(exercise.dayId, (countByDay.get(exercise.dayId) ?? 0) + 1)
  })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-slate-950/80 px-3 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">Days</p>
          <p className="text-sm font-semibold text-white">Plan Schedule</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          {days.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
        {days.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-500">
            Days will appear once the plan is created.
          </div>
        ) : (
          days.map((day) => {
            const active = day.id === activeDayId
            const count = countByDay.get(day.id) ?? 0
            return (
              <div
                key={day.id}
                className={`overflow-hidden rounded-xl border p-2 transition ${
                  active
                    ? 'border-sky-400/50 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]'
                    : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(day.id)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                      active ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  <input
                    value={day.name}
                    onChange={(e) => onRename(day.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[12px] font-semibold text-white outline-none focus:border-white/15 focus:bg-slate-950/60"
                  />
                  {day.isRestDay ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-200">
                      <Moon size={8} /> Rest
                    </span>
                  ) : count > 0 ? (
                    <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                      {count}
                    </span>
                  ) : null}
                </button>
                <div className="mt-1.5 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleRest(day.id, !day.isRestDay)}
                    title={day.isRestDay ? 'Mark as training day' : 'Mark as rest day'}
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
                      day.isRestDay
                        ? 'border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {day.isRestDay ? <Sun size={10} /> : <Moon size={10} />}
                    {day.isRestDay ? 'Train' : 'Rest'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(day)}
                    title="Duplicate day"
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300 transition hover:bg-white/10"
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
