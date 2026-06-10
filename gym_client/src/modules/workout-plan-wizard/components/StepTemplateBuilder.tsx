import { useState } from 'react'
import type { Exercise } from '../../../types/exercise'
import type { Stretch } from '../../../types/stretch'
import type { Warmup } from '../../../types/warmup'
import { DAY_LABELS, type WizardBasicInfo, type WizardDayDraft, type WizardWeekDraft } from '../types'
import { DayConfigDrawer } from './DayConfigDrawer'

interface Props {
  basic: WizardBasicInfo
  weeks: WizardWeekDraft[]
  exercises: Exercise[]
  warmups: Warmup[]
  stretches: Stretch[]
  onWeeksChange: (weeks: WizardWeekDraft[]) => void
}

function estimateDayMinutes(day: WizardDayDraft): number {
  if (day.isRestDay || day.focusArea === 'Rest Day') return 0
  if (day.durationMinutes) return day.durationMinutes
  const lift = day.exercises.reduce((s, e) => s + Math.max(1, e.sets) * (1 + Math.round(e.restBetweenSets / 60)), 0)
  return lift + day.warmups.length * 2 + day.stretches.length * 2
}

export function StepTemplateBuilder({ basic, weeks, exercises, warmups, stretches, onWeeksChange }: Props) {
  const [activeWeek, setActiveWeek] = useState(0)
  const [editingDay, setEditingDay] = useState<WizardDayDraft | null>(null)

  const week = weeks[activeWeek]
  if (!week) return null

  function updateDay(dayNumber: number, next: WizardDayDraft) {
    onWeeksChange(
      weeks.map((w, wi) =>
        wi === activeWeek
          ? { ...w, days: w.days.map((d) => (d.dayNumber === dayNumber ? next : d)) }
          : w,
      ),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {weeks.map((w, i) => (
          <button
            key={w.weekNumber}
            type="button"
            onClick={() => setActiveWeek(i)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activeWeek === i
                ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
            }`}
          >
            {basic.templateMode === 'SIMPLE' ? 'Week template' : w.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-400">
        {basic.templateMode === 'SIMPLE'
          ? 'This single week repeats automatically for the full plan duration.'
          : `Template cycles A → ${weeks.length === 2 ? 'B' : weeks.length === 3 ? 'C' : 'D'} until day ${basic.durationDays}.`}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {week.days.map((day) => {
          const isRest = day.isRestDay || day.focusArea === 'Rest Day'
          const est = estimateDayMinutes(day)
          return (
            <button
              key={day.dayNumber}
              type="button"
              onClick={() => setEditingDay(day)}
              className={`rounded-2xl border p-4 text-left transition hover:border-sky-400/40 ${
                isRest ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-slate-950/60'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{DAY_LABELS[day.dayNumber - 1]}</p>
              <p className="mt-1 text-base font-semibold text-white">{day.focusArea || day.name || 'Configure'}</p>
              {isRest ? (
                <p className="mt-2 text-xs text-emerald-300">Rest day</p>
              ) : (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
                  <li>{day.exercises.length} exercises</li>
                  <li>{day.warmups.length} warmups · {day.stretches.length} stretches</li>
                  <li>~{est} min</li>
                </ul>
              )}
            </button>
          )
        })}
      </div>

      {editingDay && (
        <DayConfigDrawer
          day={editingDay}
          exercises={exercises}
          warmups={warmups}
          stretches={stretches}
          onClose={() => setEditingDay(null)}
          onChange={(next) => {
            updateDay(next.dayNumber, next)
            setEditingDay(next)
          }}
        />
      )}
    </div>
  )
}
