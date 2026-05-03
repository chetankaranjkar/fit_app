import { Moon } from 'lucide-react'
import type { BuilderDay, BuilderExercise } from '../types'

interface DayTabsProps {
  days: BuilderDay[]
  activeDayId: number | null
  onSelect: (dayId: number) => void
  exercises?: BuilderExercise[]
}

export function DayTabs({ days, activeDayId, onSelect, exercises = [] }: DayTabsProps) {
  const countByDay = new Map<number, number>()
  exercises.forEach((exercise) => {
    countByDay.set(exercise.dayId, (countByDay.get(exercise.dayId) ?? 0) + 1)
  })

  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 p-1">
      {days.map((day) => {
        const active = day.id === activeDayId
        const count = countByDay.get(day.id) ?? 0
        return (
          <button
            key={day.id}
            type="button"
            onClick={() => onSelect(day.id)}
            className={`group flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? 'bg-sky-500/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
                active ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
              }`}
            >
              {day.dayNumber}
            </span>
            <span className="hidden md:inline">{day.name}</span>
            <span className="md:hidden">D{day.dayNumber}</span>
            {day.isRestDay ? (
              <span
                className={`flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold ${
                  active ? 'bg-amber-400/20 text-amber-100' : 'bg-amber-500/10 text-amber-300/80'
                }`}
              >
                <Moon size={9} /> Rest
              </span>
            ) : count > 0 ? (
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
