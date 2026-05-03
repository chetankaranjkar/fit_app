import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { ChevronDown, ChevronUp, Copy, GripVertical, PlayCircle, Trash2 } from 'lucide-react'
import type { WorkoutCanvasExercise } from '../types'

interface DraggableExerciseProps {
  item: WorkoutCanvasExercise
  index: number
  isSelected?: boolean
  onChange: (index: number, patch: Partial<WorkoutCanvasExercise>) => void
  onDelete: (index: number) => void
  onDuplicate: (index: number) => void
  onSelect?: (item: WorkoutCanvasExercise) => void
}

export function DraggableExercise({
  item,
  index,
  isSelected,
  onChange,
  onDelete,
  onDuplicate,
  onSelect,
}: DraggableExerciseProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.clientKey,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border p-3 transition ${
        isSelected
          ? 'border-sky-400/70 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
          : 'border-white/10 bg-slate-900/80 hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            title="Drag to reorder"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800"
          >
            <GripVertical size={16} />
          </button>
          <button
            type="button"
            onClick={() => onSelect?.(item)}
            title="Preview in 3D coach"
            className="flex flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-white/5"
          >
            <PlayCircle
              size={16}
              className={isSelected ? 'text-sky-300' : 'text-slate-500 group-hover:text-slate-300'}
            />
            <div className="min-w-0">
              <p className={`truncate text-sm font-semibold ${isSelected ? 'text-sky-100' : 'text-white'}`}>
                {item.name}
              </p>
              <p className="truncate text-xs text-slate-400">{item.muscleGroupPrimary ?? 'General'}</p>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicate(index)}
            className="rounded-md p-1 text-slate-300 hover:bg-slate-800"
            title="Duplicate"
            aria-label="Duplicate exercise"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => onDelete(index)}
            className="rounded-md p-1 text-rose-300 hover:bg-rose-950/40"
            title="Delete"
            aria-label="Delete exercise"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => onChange(index, { isExpanded: !item.isExpanded })}
            className="rounded-md p-1 text-slate-300 hover:bg-slate-800"
            title={item.isExpanded ? 'Collapse' : 'Expand'}
            aria-label={item.isExpanded ? 'Collapse exercise' : 'Expand exercise'}
          >
            {item.isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {item.isExpanded && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <label className="text-slate-300">
            Sets
            <input
              value={item.sets ?? ''}
              onChange={(e) => onChange(index, { sets: Number(e.target.value || 0) })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white"
            />
          </label>
          <label className="text-slate-300">
            Reps
            <input
              value={item.reps ?? ''}
              onChange={(e) => onChange(index, { reps: Number(e.target.value || 0) })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white"
            />
          </label>
          <label className="text-slate-300">
            Weight
            <input
              value={item.weight ?? ''}
              onChange={(e) => onChange(index, { weight: Number(e.target.value || 0) })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white"
            />
          </label>
          <label className="text-slate-300">
            Rest (sec)
            <input
              value={item.restTime ?? ''}
              onChange={(e) => onChange(index, { restTime: Number(e.target.value || 0) })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white"
            />
          </label>
          <label className="col-span-2 text-slate-300">
            Superset Group
            <input
              value={item.supersetGroup ?? ''}
              onChange={(e) => onChange(index, { supersetGroup: e.target.value.trim() || undefined })}
              placeholder="e.g. A, B, Push-Pull"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white"
            />
          </label>
        </div>
      )}
    </div>
  )
}
