import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useRef, useState } from 'react'
import type { ExerciseLibraryItem, WorkoutCanvasExercise } from '../types'
import { DraggableExercise } from './DraggableExercise'

declare global {
  interface Window {
    __workoutStudioDragPayload?: string
  }
}

interface WorkoutCanvasProps {
  items: WorkoutCanvasExercise[]
  selectedClientKey?: string | null
  onReorder: (items: WorkoutCanvasExercise[]) => void
  onChange: (index: number, patch: Partial<WorkoutCanvasExercise>) => void
  onDelete: (index: number) => void
  onDuplicate: (index: number) => void
  onSelect?: (item: WorkoutCanvasExercise) => void
  onExternalDrop?: (item: ExerciseLibraryItem) => void
}

export function WorkoutCanvas({
  items,
  selectedClientKey,
  onReorder,
  onChange,
  onDelete,
  onDuplicate,
  onSelect,
  onExternalDrop,
}: WorkoutCanvasProps) {
  const [isExternalDragOver, setIsExternalDragOver] = useState(false)
  const dragDepth = useRef(0)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )
  const lanePalette = [
    'border-sky-400/30 bg-sky-500/5 text-sky-300',
    'border-violet-400/30 bg-violet-500/5 text-violet-300',
    'border-emerald-400/30 bg-emerald-500/5 text-emerald-300',
    'border-amber-400/30 bg-amber-500/5 text-amber-300',
    'border-rose-400/30 bg-rose-500/5 text-rose-300',
  ]
  const supersetKeys = Array.from(
    new Set(items.map((item) => item.supersetGroup?.trim()).filter((value): value is string => Boolean(value))),
  )
  const colorByGroup = new Map<string, string>()
  supersetKeys.forEach((key, index) => colorByGroup.set(key, lanePalette[index % lanePalette.length]))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.clientKey === active.id)
    const newIndex = items.findIndex((item) => item.clientKey === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({ ...item, orderIndex: idx }))
    onReorder(next)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.clientKey)} strategy={verticalListSortingStrategy}>
        <div
          className={`min-h-[58vh] space-y-3 rounded-2xl border border-dashed p-3 transition ${
            isExternalDragOver
              ? 'border-sky-400 bg-sky-500/10'
              : 'border-white/15 bg-slate-950/40'
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            dragDepth.current += 1
            if (dragDepth.current === 1) console.log('[WorkoutCanvas] dragenter')
            setIsExternalDragOver(true)
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1)
            if (dragDepth.current === 0) setIsExternalDragOver(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            event.stopPropagation()
            dragDepth.current = 0
            setIsExternalDragOver(false)
            const raw =
              event.dataTransfer.getData('application/x-workout-exercise') ||
              event.dataTransfer.getData('text/plain') ||
              window.__workoutStudioDragPayload
            console.log('[WorkoutCanvas] drop, payload length =', raw?.length ?? 0)
            if (!raw || !onExternalDrop) return
            try {
              const parsed = JSON.parse(raw) as ExerciseLibraryItem
              if (parsed?.id && parsed?.name) {
                onExternalDrop(parsed)
                console.log('[WorkoutCanvas] onExternalDrop fired for', parsed.name)
              }
            } catch (err) {
              console.warn('[WorkoutCanvas] payload parse failed', err)
            } finally {
              window.__workoutStudioDragPayload = undefined
            }
          }}
        >
          {isExternalDragOver ? (
            <div className="rounded-xl border border-sky-300/60 bg-sky-400/10 px-3 py-2 text-center text-sm font-medium text-sky-200">
              Drop exercise anywhere in this canvas
            </div>
          ) : null}
          {supersetKeys.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-2">
              {supersetKeys.map((key) => {
                const lane = colorByGroup.get(key) ?? lanePalette[0]
                return (
                  <span key={key} className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${lane}`}>
                    Superset {key}
                  </span>
                )
              })}
            </div>
          ) : null}
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.clientKey} className={item.supersetGroup ? `rounded-2xl border p-1 ${colorByGroup.get(item.supersetGroup.trim()) ?? ''}` : ''}>
                <DraggableExercise
                  item={item}
                  index={index}
                  isSelected={selectedClientKey === item.clientKey}
                  onChange={onChange}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  )
}
