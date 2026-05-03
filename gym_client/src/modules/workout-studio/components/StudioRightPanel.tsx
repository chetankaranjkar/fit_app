import { useState } from 'react'
import { Activity, Sparkles, User } from 'lucide-react'
import type { GenerateAiWorkoutInput, WorkoutCanvasExercise } from '../types'
import { AIWorkoutForm } from './AIWorkoutForm'
import { ExerciseCoachPanel } from './ExerciseCoachPanel'
import { MuscleActivationMap } from './MuscleActivationMap'

type RightTab = 'coach' | 'muscles' | 'ai'

interface StudioRightPanelProps {
  selectedExercise: WorkoutCanvasExercise | null
  selectedExerciseName: string | null
  aiLoading: boolean
  onAiSubmit: (payload: GenerateAiWorkoutInput) => void
}

const TABS: Array<{ id: RightTab; label: string; icon: typeof Sparkles }> = [
  { id: 'coach', label: 'Coach', icon: User },
  { id: 'muscles', label: 'Muscles', icon: Activity },
  { id: 'ai', label: 'AI Build', icon: Sparkles },
]

export function StudioRightPanel({
  selectedExercise,
  selectedExerciseName,
  aiLoading,
  onAiSubmit,
}: StudioRightPanelProps) {
  const [tab, setTab] = useState<RightTab>('coach')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-[0_18px_40px_-22px_rgba(56,189,248,0.35)]">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-white/5 bg-slate-950/80 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                active
                  ? 'bg-sky-500/15 text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {tab === 'coach' ? <ExerciseCoachPanel selectedExercise={selectedExercise} /> : null}
        {tab === 'muscles' ? <MuscleActivationMap selectedExercise={selectedExerciseName} /> : null}
        {tab === 'ai' ? <AIWorkoutForm loading={aiLoading} onSubmit={onAiSubmit} /> : null}
      </div>
    </div>
  )
}
