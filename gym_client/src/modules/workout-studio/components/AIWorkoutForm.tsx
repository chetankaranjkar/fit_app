import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { GenerateAiWorkoutInput } from '../types'

interface AIWorkoutFormProps {
  loading: boolean
  onSubmit: (payload: GenerateAiWorkoutInput) => void
}

const GOALS = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance', 'General Fitness']
const EXPERIENCES = ['Beginner', 'Intermediate', 'Advanced']

export function AIWorkoutForm({ loading, onSubmit }: AIWorkoutFormProps) {
  const [goal, setGoal] = useState('Muscle Gain')
  const [experience, setExperience] = useState('Intermediate')
  const [days, setDays] = useState(4)
  const [duration, setDuration] = useState(60)
  const [equipment, setEquipment] = useState('Barbell,Dumbbell,Bench')
  const [injuries, setInjuries] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          goal,
          experience,
          days,
          duration,
          equipment: equipment.split(',').map((x) => x.trim()).filter(Boolean),
          injuries: injuries.trim() || undefined,
        })
      }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_18px_40px_-22px_rgba(168,85,247,0.45)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-slate-950/60 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">AI Builder</p>
          <p className="truncate text-sm font-semibold text-white">Generate a tailored plan</p>
        </div>
        <Sparkles size={16} className="text-violet-300" />
      </div>

      <div className="space-y-3 px-3 py-3 text-[12px]">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Goal</p>
          <div className="flex flex-wrap gap-1">
            {GOALS.map((option) => {
              const active = goal === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGoal(option)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                    active
                      ? 'border-violet-400/50 bg-violet-500/15 text-violet-100'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Experience</p>
          <div className="flex gap-1">
            {EXPERIENCES.map((option) => {
              const active = experience === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setExperience(option)}
                  className={`flex-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                    active
                      ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Days / week
            <input
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(Number(e.target.value || 1))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm font-semibold text-white outline-none focus:border-sky-400/50"
            />
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Duration (min)
            <input
              type="number"
              min={15}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value || 30))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm font-semibold text-white outline-none focus:border-sky-400/50"
            />
          </label>
        </div>

        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Equipment
          <input
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="Barbell, Dumbbell, Bench"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-[12px] text-white outline-none focus:border-sky-400/50"
          />
        </label>

        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Injuries (optional)
          <input
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder="Lower back, knee, etc."
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-[12px] text-white outline-none focus:border-sky-400/50"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-violet-400 px-3 py-2 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_-10px_rgba(168,85,247,0.6)] transition hover:opacity-95 disabled:opacity-60"
        >
          <Sparkles size={14} />
          {loading ? 'Generating…' : 'Generate Workout'}
        </button>
      </div>
    </form>
  )
}
