import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { stretchesService } from '../../../services/stretches.service'
import { warmupsService } from '../../../services/warmups.service'
import { workoutCategoriesService } from '../../../services/workoutCategories.service'
import type { PlanStretchWriteDto, WorkoutPlanStretch } from '../../../types/stretch'
import type { PlanWarmupWriteDto, WorkoutPlanWarmup } from '../../../types/warmup'

type Props = {
  warmups: WorkoutPlanWarmup[]
  stretches: WorkoutPlanStretch[]
  workoutCategoryId?: number | null
  workoutCategoryName?: string | null
  useDefaultWarmups?: boolean
  useDefaultStretches?: boolean
  onWarmupsChange: (items: WorkoutPlanWarmup[]) => void
  onStretchesChange: (items: WorkoutPlanStretch[]) => void
  onCategoryChange?: (categoryId: number) => void
  onUseDefaultWarmupsChange?: (value: boolean) => void
  onUseDefaultStretchesChange?: (value: boolean) => void
  onSave: (payload: { warmups: PlanWarmupWriteDto[]; stretches: PlanStretchWriteDto[] }) => void
  onSaveCategorySettings?: () => void
  isSaving?: boolean
  isSavingCategory?: boolean
}

export function PlanWarmupStretchTab({
  warmups,
  stretches,
  workoutCategoryId,
  workoutCategoryName,
  useDefaultWarmups = true,
  useDefaultStretches = true,
  onWarmupsChange,
  onStretchesChange,
  onCategoryChange,
  onUseDefaultWarmupsChange,
  onUseDefaultStretchesChange,
  onSave,
  onSaveCategorySettings,
  isSaving,
  isSavingCategory,
}: Props) {
  const [warmupSearch, setWarmupSearch] = useState('')
  const [stretchSearch, setStretchSearch] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['workout-categories'],
    queryFn: async () => {
      const { data } = await workoutCategoriesService.getAll()
      return data.filter((c) => c.isActive)
    },
  })

  const { data: warmupCatalog = [] } = useQuery({
    queryKey: ['warmups-all'],
    queryFn: async () => {
      const { data } = await warmupsService.getAll()
      return data.filter((w) => w.isActive)
    },
  })

  const { data: stretchCatalog = [] } = useQuery({
    queryKey: ['stretches-all'],
    queryFn: async () => {
      const { data } = await stretchesService.getAll()
      return data.filter((s) => s.isActive)
    },
  })

  const filteredWarmups = useMemo(() => {
    const q = warmupSearch.trim().toLowerCase()
    if (!q) return warmupCatalog
    return warmupCatalog.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.bodyPart?.toLowerCase().includes(q) ?? false),
    )
  }, [warmupCatalog, warmupSearch])

  const filteredStretches = useMemo(() => {
    const q = stretchSearch.trim().toLowerCase()
    if (!q) return stretchCatalog
    return stretchCatalog.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.bodyPart?.toLowerCase().includes(q) ?? false),
    )
  }, [stretchCatalog, stretchSearch])

  async function loadCategoryDefaults() {
    if (!workoutCategoryId || workoutCategoryId <= 0) return
    const { data: category } = await workoutCategoriesService.getById(workoutCategoryId)
    onWarmupsChange(
      category.warmups.map((w) => ({
        id: 0,
        warmupId: w.warmupId,
        name: w.name,
        description: w.description,
        videoUrl: w.videoUrl,
        durationSeconds: w.durationSeconds,
        bodyPart: w.bodyPart,
        displayOrder: w.displayOrder,
      })),
    )
    onStretchesChange(
      category.stretches.map((s) => ({
        id: 0,
        stretchId: s.stretchId,
        name: s.name,
        description: s.description,
        videoUrl: s.videoUrl,
        durationSeconds: s.durationSeconds,
        bodyPart: s.bodyPart,
        displayOrder: s.displayOrder,
      })),
    )
  }

  function addWarmup(warmupId: number) {
    if (warmups.some((w) => w.warmupId === warmupId)) return
    const master = warmupCatalog.find((w) => w.id === warmupId)
    if (!master) return
    onUseDefaultWarmupsChange?.(false)
    const next: WorkoutPlanWarmup = {
      id: 0,
      warmupId: master.id,
      name: master.name,
      description: master.description,
      videoUrl: master.videoUrl,
      durationSeconds: master.durationSeconds,
      difficultyLevel: master.difficultyLevel,
      bodyPart: master.bodyPart,
      caloriesBurn: master.caloriesBurn,
      displayOrder: warmups.length + 1,
    }
    onWarmupsChange([...warmups, next])
  }

  function addStretch(stretchId: number) {
    if (stretches.some((s) => s.stretchId === stretchId)) return
    const master = stretchCatalog.find((s) => s.id === stretchId)
    if (!master) return
    onUseDefaultStretchesChange?.(false)
    const next: WorkoutPlanStretch = {
      id: 0,
      stretchId: master.id,
      name: master.name,
      description: master.description,
      videoUrl: master.videoUrl,
      durationSeconds: master.durationSeconds,
      difficultyLevel: master.difficultyLevel,
      bodyPart: master.bodyPart,
      displayOrder: stretches.length + 1,
    }
    onStretchesChange([...stretches, next])
  }

  function moveWarmup(index: number, dir: -1 | 1) {
    onUseDefaultWarmupsChange?.(false)
    const target = index + dir
    if (target < 0 || target >= warmups.length) return
    const next = [...warmups]
    ;[next[index], next[target]] = [next[target], next[index]]
    onWarmupsChange(next.map((w, i) => ({ ...w, displayOrder: i + 1 })))
  }

  function moveStretch(index: number, dir: -1 | 1) {
    onUseDefaultStretchesChange?.(false)
    const target = index + dir
    if (target < 0 || target >= stretches.length) return
    const next = [...stretches]
    ;[next[index], next[target]] = [next[target], next[index]]
    onStretchesChange(next.map((s, i) => ({ ...s, displayOrder: i + 1 })))
  }

  function handleSave() {
    onSave({
      warmups: warmups.map((w, i) => ({ warmupId: w.warmupId, displayOrder: i + 1 })),
      stretches: stretches.map((s, i) => ({ stretchId: s.stretchId, displayOrder: i + 1 })),
    })
  }

  const selectClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100'

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-200">Category template</h3>
        <p className="mt-1 text-xs text-slate-400">
          Select a training focus to auto-load default warmups and stretches.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Workout category
            </label>
            <select
              value={workoutCategoryId ?? 0}
              onChange={(e) => onCategoryChange?.(Number(e.target.value))}
              className={selectClass}
            >
              <option value={0} className="bg-slate-900">
                None
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-slate-900">
                  {cat.name}
                </option>
              ))}
            </select>
            {workoutCategoryName && (
              <p className="mt-1 text-xs text-slate-500">Current: {workoutCategoryName}</p>
            )}
          </div>
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={useDefaultWarmups}
                onChange={(e) => onUseDefaultWarmupsChange?.(e.target.checked)}
              />
              Use category default warmups
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={useDefaultStretches}
                onChange={(e) => onUseDefaultStretchesChange?.(e.target.checked)}
              />
              Use category default stretches
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={() => void loadCategoryDefaults()} disabled={!workoutCategoryId}>
            Load category defaults
          </Button>
          {onSaveCategorySettings && (
            <Button variant="soft" size="sm" onClick={onSaveCategorySettings} isLoading={isSavingCategory}>
              Save category settings
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200">Warmup section</h3>
        <p className="mt-1 text-xs text-slate-400">
          {useDefaultWarmups
            ? 'Showing category defaults. Customize below to override.'
            : 'Custom warmups for this plan.'}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <Input placeholder="Search warmups…" value={warmupSearch} onChange={(e) => setWarmupSearch(e.target.value)} />
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
              {filteredWarmups.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/10"
                  onClick={() => addWarmup(w.id)}
                >
                  <span>{w.name}</span>
                  <span className="text-xs text-slate-500">{w.durationSeconds}s</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Plan warmups ({warmups.length})</p>
            <ul className="space-y-2">
              {warmups.map((w, i) => (
                <li key={`${w.warmupId}-${i}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                  <span className="flex-1 text-white">{w.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => moveWarmup(i, -1)} disabled={i === 0}>
                    ↑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveWarmup(i, 1)} disabled={i === warmups.length - 1}>
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-300"
                    onClick={() => {
                      onUseDefaultWarmupsChange?.(false)
                      onWarmupsChange(warmups.filter((_, idx) => idx !== i))
                    }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-200">Stretch section</h3>
        <p className="mt-1 text-xs text-slate-400">
          {useDefaultStretches
            ? 'Showing category defaults. Customize below to override.'
            : 'Custom stretches for this plan.'}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <Input placeholder="Search stretches…" value={stretchSearch} onChange={(e) => setStretchSearch(e.target.value)} />
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
              {filteredStretches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/10"
                  onClick={() => addStretch(s.id)}
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-slate-500">{s.durationSeconds}s</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Plan stretches ({stretches.length})</p>
            <ul className="space-y-2">
              {stretches.map((s, i) => (
                <li key={`${s.stretchId}-${i}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                  <span className="flex-1 text-white">{s.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => moveStretch(i, -1)} disabled={i === 0}>
                    ↑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveStretch(i, 1)} disabled={i === stretches.length - 1}>
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-300"
                    onClick={() => {
                      onUseDefaultStretchesChange?.(false)
                      onStretchesChange(stretches.filter((_, idx) => idx !== i))
                    }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving}>
          Save warmup & stretch
        </Button>
      </div>
    </div>
  )
}
