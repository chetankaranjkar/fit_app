import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import { Inbox } from 'lucide-react'
import type { BuilderExercise } from '../types'
import { ExerciseCard } from './ExerciseCard'

interface ExerciseDropZoneProps {
  items: BuilderExercise[]
  onReorder: (items: BuilderExercise[]) => void
  onChange: (item: BuilderExercise, patch: Partial<BuilderExercise>) => void
  onDelete: (item: BuilderExercise) => void
  onExternalDrop?: (item: { id: number; name: string }) => void
}

export function ExerciseDropZone({ items, onReorder, onChange, onDelete, onExternalDrop }: ExerciseDropZoneProps) {
  const [over, setOver] = useState(false)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.clientKey === active.id)
    const newIndex = items.findIndex((item) => item.clientKey === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, orderIndex: index }))
    onReorder(next)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.clientKey)} strategy={verticalListSortingStrategy}>
        <div
          className={`min-h-full space-y-1.5 rounded-2xl border-2 border-dashed p-2 transition ${
            over ? 'border-sky-400/60 bg-sky-500/5' : 'border-white/15 bg-slate-950/40'
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            if (!over) setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setOver(false)
            const raw =
              event.dataTransfer.getData('application/x-workout-exercise') || event.dataTransfer.getData('text/plain')
            if (!raw || !onExternalDrop) return
            try {
              const parsed = JSON.parse(raw) as { id: number; name: string }
              if (Number.isInteger(parsed?.id) && parsed?.id > 0 && parsed?.name) onExternalDrop(parsed)
            } catch {
              // Ignore malformed payload
            }
          }}
        >
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-slate-500">
              <Inbox size={28} className="opacity-50" />
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em]">Drop exercises here</p>
              <p className="max-w-xs text-[11px] text-slate-600">
                Drag from the library, or click an exercise to add it to this day.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <ExerciseCard
                key={item.clientKey}
                item={item}
                onChange={(patch) => onChange(item, patch)}
                onDelete={() => onDelete(item)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
