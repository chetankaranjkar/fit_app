import { Sparkles, Target } from 'lucide-react'
import type { BuilderPlanInput } from '../types'

interface PlanFormProps {
  value: BuilderPlanInput
  onChange: (patch: Partial<BuilderPlanInput>) => void
  onCreate: () => void
  creating?: boolean
  variant?: 'hero' | 'inline'
}

const GOALS = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance', 'General Fitness']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

export function PlanForm({ value, onChange, onCreate, creating = false, variant = 'hero' }: PlanFormProps) {
  const isHero = variant === 'hero'

  return (
    <div
      className={
        isHero
          ? 'mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-[0_30px_80px_-30px_rgba(56,189,248,0.45)]'
          : 'overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60'
      }
    >
      {isHero ? (
        <div className="flex items-center gap-3 border-b border-white/5 bg-slate-950/60 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-400/30">
            <Target size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">Get started</p>
            <p className="text-base font-semibold text-white">Create your workout plan</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-slate-950/60 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">Edit Plan</p>
        </div>
      )}

      <div className={isHero ? 'space-y-3 px-5 py-5' : 'space-y-3 px-3 py-3'}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Plan name
            <input
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Push Pull Legs"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-sm font-medium text-white outline-none focus:border-sky-400/50"
            />
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Duration (days)
            <input
              type="number"
              min={1}
              max={365}
              value={value.duration}
              onChange={(e) => onChange({ duration: Number(e.target.value || 30) })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-sm font-medium text-white outline-none focus:border-sky-400/50"
            />
          </label>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Goal</p>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map((option) => {
              const active = value.goal === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange({ goal: option })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
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

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Difficulty</p>
          <div className="flex gap-1.5">
            {DIFFICULTIES.map((option) => {
              const active = value.difficulty === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange({ difficulty: option })}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
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

        <button
          onClick={onCreate}
          disabled={creating || !value.name.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-violet-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_-12px_rgba(56,189,248,0.6)] transition hover:opacity-95 disabled:opacity-60"
        >
          <Sparkles size={14} />
          {creating ? 'Creating plan…' : isHero ? 'Create Plan' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
