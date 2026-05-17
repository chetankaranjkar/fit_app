import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '../../../components/ui/Button'
import type { ProgramWeekDto, SaveProgramStructureDto } from '../../../types/workoutPlan'

export function toStructurePayload(weeks: ProgramWeekDto[]): SaveProgramStructureDto {
  return {
    weeks: weeks.map((w) => ({
      weekNumber: w.weekNumber,
      name: w.name,
      days: w.days.map((d) => ({
        dayNumber: d.dayNumber,
        name: d.dayName,
        focusArea: d.focusArea,
        durationMinutes: d.durationMinutes,
        notes: d.notes,
        isRestDay: d.isRestDay,
        orderIndex: d.orderIndex,
        exercises: d.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          restBetweenSets: e.restBetweenSets,
          order: e.order,
          weight: e.weight,
          tempo: e.tempo,
          intensity: e.intensity,
          notes: e.notes,
        })),
      })),
    })),
  }
}

function SortableDayRow({
  id,
  label,
  subtitle,
  isRest,
}: {
  id: string
  label: string
  subtitle: string
  isRest: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 transition hover:bg-white/[0.06] ${
        isDragging ? 'opacity-80 ring-2 ring-cyan-400/40' : ''
      } ${isRest ? 'border-emerald-500/20 bg-emerald-500/5' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="truncate text-xs text-slate-400">{subtitle}</p>
      </div>
      {isRest && (
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          Rest
        </span>
      )}
    </div>
  )
}

type Props = {
  weeks: ProgramWeekDto[]
  onWeeksChange: (next: ProgramWeekDto[]) => void
  onSave: (payload: SaveProgramStructureDto) => void | Promise<unknown>
  isSaving: boolean
  aiSuggest: () => void
}

export function WeekScheduleTab({ weeks, onWeeksChange, onSave, isSaving, aiSuggest }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  if (!weeks.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
        No weekly template yet. Open a seeded program or use Program Builder, then return here to reorder days.
      </div>
    )
  }

  function onDragEndForWeek(weekIndex: number, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const w = weeks[weekIndex]
    const dayIds = w.days.map((d) => `w${weekIndex}-d-${d.id}`)
    const oldIndex = dayIds.indexOf(String(active.id))
    const newIndex = dayIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(w.days, oldIndex, newIndex).map((d, i) => ({
      ...d,
      orderIndex: i + 1,
    }))
    const next = weeks.map((wk, i) => (i === weekIndex ? { ...wk, days: reordered } : wk))
    onWeeksChange(next)
  }

  function toggleRest(weekIndex: number, dayId: number) {
    const next = weeks.map((wk, wi) => {
      if (wi !== weekIndex) return wk
      return {
        ...wk,
        days: wk.days.map((d) =>
          d.id === dayId
            ? { ...d, isRestDay: !d.isRestDay, exercises: d.isRestDay ? d.exercises : [] }
            : d,
        ),
      }
    })
    onWeeksChange(next)
  }

  function duplicateWeek() {
    const copyNum = weeks.length + 1
    const last = weeks[weeks.length - 1]
    const cloned: ProgramWeekDto = {
      ...last,
      id: -Date.now(),
      weekNumber: copyNum,
      name: `Week ${copyNum}`,
      days: last.days.map((d, i) => ({
        ...d,
        id: -(Date.now() + i),
        weekId: -Date.now(),
        exercises: d.exercises.map((e, j) => ({ ...e, id: -(Date.now() + i * 100 + j) })),
      })),
    }
    onWeeksChange([...weeks, cloned])
  }

  function copyPreviousWeek() {
    if (weeks.length < 2) return
    const prev = weeks[weeks.length - 2]
    const cur = weeks[weeks.length - 1]
    const merged: ProgramWeekDto = {
      ...cur,
      days: prev.days.map((d, i) => ({
        ...d,
        id: cur.days[i]?.id ?? d.id,
        weekId: cur.id,
        dayNumber: d.dayNumber,
        exercises: d.exercises.map((e, j) => ({
          ...e,
          id: cur.days[i]?.exercises[j]?.id ?? e.id,
        })),
      })),
    }
    onWeeksChange([...weeks.slice(0, -1), merged])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="soft" size="sm" onClick={aiSuggest}>
          AI suggest split
        </Button>
        <Button type="button" variant="soft" size="sm" onClick={duplicateWeek}>
          Duplicate week
        </Button>
        <Button type="button" variant="soft" size="sm" onClick={copyPreviousWeek} disabled={weeks.length < 2}>
          Copy previous week
        </Button>
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          isLoading={isSaving}
          onClick={() => void Promise.resolve(onSave(toStructurePayload(weeks)))}
        >
          Save schedule
        </Button>
      </div>

      {weeks.map((w, weekIndex) => {
        const ids = w.days.map((d) => `w${weekIndex}-d-${d.id}`)
        return (
          <section key={w.id} className="glass-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">
                Week {w.weekNumber}
                {w.name ? <span className="text-slate-400"> — {w.name}</span> : null}
              </h3>
              <p className="text-xs text-slate-500">Drag to reorder training days. Rest days exclude lifting blocks.</p>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => onDragEndForWeek(weekIndex, e)}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {w.days.map((d) => (
                    <div key={d.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="flex-1">
                        <SortableDayRow
                          id={`w${weekIndex}-d-${d.id}`}
                          label={d.dayName}
                          subtitle={
                            d.isRestDay
                              ? 'Recovery'
                              : `${d.focusArea ?? 'Training'}${d.durationMinutes ? ` · ~${d.durationMinutes} min` : ''}`
                          }
                          isRest={d.isRestDay}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => toggleRest(weekIndex, d.id)}>
                        {d.isRestDay ? 'Mark training' : 'Mark rest'}
                      </Button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        )
      })}
    </div>
  )
}
