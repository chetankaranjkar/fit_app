import type { WorkoutCanvasExercise, WorkoutDay } from '../types'

interface WorkoutDayTabsProps {
  days: WorkoutDay[]
  activeDayId: string | null
  onSelect: (dayId: string) => void
  exercises?: WorkoutCanvasExercise[]
}

export function WorkoutDayTabs({ days, activeDayId, onSelect, exercises = [] }: WorkoutDayTabsProps) {
  const countByDay = new Map<string, number>()
  exercises.forEach((exercise) => {
    if (!exercise.workoutDayId) return
    countByDay.set(exercise.workoutDayId, (countByDay.get(exercise.workoutDayId) ?? 0) + 1)
  })

  return (
    <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 p-1">
      {days.map((day, index) => {
        const active = day.id === activeDayId
        const count = countByDay.get(day.id) ?? 0
        return (
          <button
            key={day.id}
            type="button"
            onClick={() => onSelect(day.id)}
            className={`group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? 'bg-sky-500/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
                active ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
              }`}
            >
              {index + 1}
            </span>
            <span>{day.dayName}</span>
            {count > 0 ? (
              <span
                className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                  active ? 'bg-sky-400/20 text-sky-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
