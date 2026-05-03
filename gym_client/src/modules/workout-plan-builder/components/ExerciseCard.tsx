import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { Dumbbell, GripVertical, Trash2 } from 'lucide-react'
import type { BuilderExercise } from '../types'

interface ExerciseCardProps {
  item: BuilderExercise
  onChange: (patch: Partial<BuilderExercise>) => void
  onDelete: () => void
}

export function ExerciseCard({ item, onChange, onDelete }: ExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.clientKey })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl border border-white/10 bg-slate-900/80 p-2.5 transition hover:border-white/20"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-400/20">
          <Dumbbell size={12} />
        </div>
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{item.name}</p>
        <button
          onClick={onDelete}
          aria-label="Delete exercise"
          className="rounded-md p-1 text-rose-300 opacity-60 transition hover:bg-rose-950/40 hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <label className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Sets
          <input
            type="number"
            min={1}
            value={item.sets}
            onChange={(e) => onChange({ sets: Number(e.target.value || 1) })}
            className="mt-0.5 w-full rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-sky-400/50"
          />
        </label>
        <label className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Reps
          <input
            type="number"
            min={1}
            value={item.reps}
            onChange={(e) => onChange({ reps: Number(e.target.value || 1) })}
            className="mt-0.5 w-full rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-sky-400/50"
          />
        </label>
        <label className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Rest (s)
          <input
            type="number"
            min={0}
            value={item.restTime}
            onChange={(e) => onChange({ restTime: Number(e.target.value || 0) })}
            className="mt-0.5 w-full rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-sky-400/50"
          />
        </label>
      </div>
    </div>
  )
}
