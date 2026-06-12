import { useEffect, useMemo, useState } from 'react'
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
import { Input } from '../../../components/ui/Input'
import type { Exercise } from '../../../types/exercise'
import type { ProgramDayDto, ProgramWeekDto, SaveProgramStructureDto, WorkoutPlanExercise } from '../../../types/workoutPlan'
import { buildDefaultWeek } from './buildDefaultWeek'
import { DayExercisePanel } from './DayExercisePanel'
import { nextTempId } from './tempIds'

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
        exercises: (d.isRestDay ? [] : d.exercises).map((e) => ({
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
  exerciseCount,
  isSelected,
  onSelect,
}: {
  id: string
  label: string
  subtitle: string
  isRest: boolean
  exerciseCount: number
  isSelected: boolean
  onSelect: () => void
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
      className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
        isDragging ? 'opacity-80 ring-2 ring-cyan-400/40' : ''
      } ${
        isSelected
          ? 'border-cyan-400/50 bg-cyan-500/10 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]'
          : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.06]'
      } ${isRest ? 'border-emerald-500/20 bg-emerald-500/5' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 active:cursor-grabbing"
        {...listeners}
        {...attributes}
        aria-label="Drag to reorder"
      >
        ⋮⋮
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="truncate text-xs text-slate-400">{subtitle}</p>
      </button>
      {!isRest && exerciseCount > 0 ? (
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
          {exerciseCount} ex
        </span>
      ) : null}
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
  exerciseLibrary: Exercise[]
  workoutsPerWeek?: number
  orphanExercises?: WorkoutPlanExercise[]
}

export function WeekScheduleTab({
  weeks,
  onWeeksChange,
  onSave,
  isSaving,
  aiSuggest,
  exerciseLibrary,
  workoutsPerWeek = 4,
  orphanExercises = [],
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeWeekIndex, setActiveWeekIndex] = useState(0)
  const [activeDayId, setActiveDayId] = useState<number | null>(null)

  const activeWeek = weeks[activeWeekIndex] ?? null
  const activeDay = useMemo(
    () => activeWeek?.days.find((d) => d.id === activeDayId) ?? null,
    [activeWeek, activeDayId],
  )

  useEffect(() => {
    if (!activeWeek?.days.length) {
      setActiveDayId(null)
      return
    }
    if (activeDayId == null || !activeWeek.days.some((d) => d.id === activeDayId)) {
      const firstTraining = activeWeek.days.find((d) => !d.isRestDay) ?? activeWeek.days[0]
      setActiveDayId(firstTraining.id)
    }
  }, [activeWeek, activeDayId])

  function generateWeek() {
    const week = buildDefaultWeek({
      workoutsPerWeek,
      orphanExercises: weeks.length === 0 ? orphanExercises : [],
    })
    onWeeksChange([week])
    setActiveWeekIndex(0)
    const firstTraining = week.days.find((d) => !d.isRestDay) ?? week.days[0]
    setActiveDayId(firstTraining.id)
  }

  function updateDay(weekIndex: number, dayId: number, nextDay: ProgramDayDto) {
    onWeeksChange(
      weeks.map((wk, wi) =>
        wi !== weekIndex
          ? wk
          : {
              ...wk,
              days: wk.days.map((d) => (d.id === dayId ? nextDay : d)),
            },
      ),
    )
  }

  if (!weeks.length) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-sm text-slate-300">No weekly template yet.</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
          Generate a 7-day calendar week (Mon–Sun). Training days match your program frequency (
          {workoutsPerWeek}×/week); assign exercises per day. Members receive the workout for each
          calendar weekday on mobile.
        </p>
        {orphanExercises.length > 0 ? (
          <p className="text-xs text-cyan-300/90">
            {orphanExercises.length} exercise(s) from the program list will seed Monday&apos;s block.
          </p>
        ) : null}
        <Button type="button" size="sm" className="mt-4" onClick={generateWeek}>
          Generate week 1
        </Button>
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
          d.id === dayId ? { ...d, isRestDay: !d.isRestDay } : d,
        ),
      }
    })
    onWeeksChange(next)
  }

  function duplicateWeek() {
    const copyNum = weeks.length + 1
    const last = weeks[weeks.length - 1]
    const newWeekId = nextTempId()
    const cloned: ProgramWeekDto = {
      ...last,
      id: newWeekId,
      weekNumber: copyNum,
      name: `Week ${copyNum}`,
      days: last.days.map((d) => ({
        ...d,
        id: nextTempId(),
        weekId: newWeekId,
        exercises: d.exercises.map((e) => ({ ...e, id: nextTempId() })),
      })),
    }
    onWeeksChange([...weeks, cloned])
    setActiveWeekIndex(weeks.length)
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

      <p className="text-xs text-slate-500">
        Select a day to assign exercises. Day numbers follow the calendar (Mon=1 … Sun=7) so mobile
        shows the correct workout each weekday.
      </p>

      {weeks.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {weeks.map((w, i) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setActiveWeekIndex(i)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                i === activeWeekIndex
                  ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                  : 'border-white/10 text-slate-400 hover:bg-white/5'
              }`}
            >
              Week {w.weekNumber}
            </button>
          ))}
        </div>
      ) : null}

      {activeWeek ? (
        <section className="glass-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">
              Week {activeWeek.weekNumber}
              {activeWeek.name ? <span className="text-slate-400"> — {activeWeek.name}</span> : null}
            </h3>
            <p className="text-xs text-slate-500">
              Drag to reorder display order. Click a day to edit its exercise list.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(240px,320px)_1fr]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => onDragEndForWeek(activeWeekIndex, e)}
            >
              <SortableContext
                items={activeWeek.days.map((d) => `w${activeWeekIndex}-d-${d.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {activeWeek.days.map((d) => (
                    <div key={d.id} className="flex flex-col gap-2">
                      <SortableDayRow
                        id={`w${activeWeekIndex}-d-${d.id}`}
                        label={d.dayName}
                        subtitle={
                          d.isRestDay
                            ? 'Recovery'
                            : `${d.focusArea ?? 'Training'}${d.durationMinutes ? ` · ~${d.durationMinutes} min` : ''}`
                        }
                        isRest={d.isRestDay}
                        exerciseCount={d.exercises.length}
                        isSelected={d.id === activeDayId}
                        onSelect={() => setActiveDayId(d.id)}
                      />
                      <div className="flex justify-end gap-2 pl-10 sm:pl-12">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRest(activeWeekIndex, d.id)}
                        >
                          {d.isRestDay ? 'Mark training' : 'Mark rest'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {activeDay ? (
              <div className="space-y-3">
                <Input
                  label="Focus area"
                  value={activeDay.focusArea ?? ''}
                  onChange={(e) =>
                    updateDay(activeWeekIndex, activeDay.id, {
                      ...activeDay,
                      focusArea: e.target.value || null,
                    })
                  }
                  placeholder="e.g. Chest & triceps"
                />
                <DayExercisePanel
                  day={activeDay}
                  exerciseLibrary={exerciseLibrary}
                  onDayChange={(next) => updateDay(activeWeekIndex, activeDay.id, next)}
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
