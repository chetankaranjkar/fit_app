import { Dumbbell, Plus } from 'lucide-react'
import { useRef } from 'react'
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { ExerciseLibraryItem } from '../types'

declare global {
  interface Window {
    __workoutStudioDragPayload?: string
  }
}

interface ExerciseCardProps {
  item: ExerciseLibraryItem
  onAdd: (item: ExerciseLibraryItem) => void
}

const DIFFICULTY_TONE: Record<string, string> = {
  beginner: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  intermediate: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  advanced: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
}

function difficultyClass(value?: string | null) {
  if (!value) return 'border-white/10 bg-white/5 text-slate-300'
  return DIFFICULTY_TONE[value.toLowerCase()] ?? 'border-white/10 bg-white/5 text-slate-300'
}

export function ExerciseCard({ item, onAdd }: ExerciseCardProps) {
  const wasDragged = useRef(false)

  function handleDragStart(event: ReactDragEvent<HTMLDivElement>) {
    wasDragged.current = true
    const payload = JSON.stringify(item)
    window.__workoutStudioDragPayload = payload
    const transfer = event.dataTransfer
    if (!transfer) return
    try {
      transfer.setData('application/x-workout-exercise', payload)
    } catch {
      // ignore — fallback channels below
    }
    try {
      transfer.setData('text/plain', payload)
      transfer.effectAllowed = 'copy'
    } catch {
      // ignore
    }
  }

  function handleDragEnd() {
    setTimeout(() => {
      wasDragged.current = false
    }, 0)
  }

  function handleClick() {
    if (wasDragged.current) return
    onAdd(item)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onAdd(item)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group relative w-full cursor-grab select-none overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-slate-950/80 to-slate-900/60 px-2.5 py-2 text-left transition hover:border-sky-400/40 hover:from-slate-900/80 hover:to-slate-900/60 active:cursor-grabbing"
    >
      <div className="pointer-events-none flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-sky-300 ring-1 ring-inset ring-white/5">
          <Dumbbell size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-white">{item.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="truncate">{item.muscleGroupPrimary ?? 'General'}</span>
            {item.difficulty ? (
              <>
                <span className="text-slate-600">·</span>
                <span
                  className={`rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em] ${difficultyClass(item.difficulty)}`}
                >
                  {item.difficulty}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/0 text-slate-500 transition group-hover:bg-sky-500/15 group-hover:text-sky-200">
          <Plus size={14} />
        </div>
      </div>
    </div>
  )
}
