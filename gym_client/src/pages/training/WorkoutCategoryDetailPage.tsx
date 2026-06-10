import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { workoutCategoriesService } from '../../services/workoutCategories.service'
import { warmupsService } from '../../services/warmups.service'
import { stretchesService } from '../../services/stretches.service'
import type { WorkoutCategoryWarmup, WorkoutCategoryStretch } from '../../types/workoutCategory'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

export function WorkoutCategoryDetailPage() {
  const { userName } = getDashboardUser()
  const { categoryId } = useParams<{ categoryId: string }>()
  const id = Number(categoryId)
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [warmups, setWarmups] = useState<WorkoutCategoryWarmup[]>([])
  const [stretches, setStretches] = useState<WorkoutCategoryStretch[]>([])
  const [warmupSearch, setWarmupSearch] = useState('')
  const [stretchSearch, setStretchSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: category, isLoading } = useQuery({
    queryKey: ['workout-category', id],
    queryFn: async () => {
      const { data } = await workoutCategoriesService.getById(id)
      return data
    },
    enabled: Number.isInteger(id) && id > 0,
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

  useEffect(() => {
    if (!category) return
    setName(category.name)
    setDescription(category.description ?? '')
    setWarmups(category.warmups)
    setStretches(category.stretches)
  }, [category?.id, category?.warmups, category?.stretches])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await workoutCategoriesService.update(id, { name: name.trim(), description: description.trim() || null })
      return workoutCategoriesService.saveWarmupStretch(id, {
        warmups: warmups.map((w, i) => ({ warmupId: w.warmupId, displayOrder: i + 1 })),
        stretches: stretches.map((s, i) => ({ stretchId: s.stretchId, displayOrder: i + 1 })),
      })
    },
    onSuccess: () => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['workout-category', id] })
      void queryClient.invalidateQueries({ queryKey: ['workout-categories'] })
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  })

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <DashboardLayout userName={userName}>
        <p className="p-6 text-slate-400">Invalid category.</p>
      </DashboardLayout>
    )
  }

  const filteredWarmups = warmupCatalog.filter((w) =>
    w.name.toLowerCase().includes(warmupSearch.toLowerCase()),
  )
  const filteredStretches = stretchCatalog.filter((s) =>
    s.name.toLowerCase().includes(stretchSearch.toLowerCase()),
  )

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Workout Categories"
        titleGradient={category?.name ?? 'Category'}
        subtitle="Configure default warmups and stretches for this training focus."
        primaryAction={{ label: 'Save changes', onClick: () => saveMutation.mutate(), }}
      >
        <div className="mb-4">
          <Link to="/dashboard/training/workout-categories" className="text-sm text-slate-400 hover:text-white">
            ← Back to categories
          </Link>
        </div>

        {isLoading || !category ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="space-y-8">
            {error && <p className="text-sm text-rose-400">{error}</p>}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Category information</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="sm:col-span-2">
                  <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200">Default warmups</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <Input placeholder="Search warmups…" value={warmupSearch} onChange={(e) => setWarmupSearch(e.target.value)} />
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
                    {filteredWarmups.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        className="flex w-full justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/10"
                        onClick={() => {
                          if (warmups.some((x) => x.warmupId === w.id)) return
                          setWarmups([
                            ...warmups,
                            {
                              id: 0,
                              warmupId: w.id,
                              name: w.name,
                              description: w.description,
                              videoUrl: w.videoUrl,
                              durationSeconds: w.durationSeconds,
                              bodyPart: w.bodyPart,
                              displayOrder: warmups.length + 1,
                            },
                          ])
                        }}
                      >
                        <span>{w.name}</span>
                        <span className="text-xs text-slate-500">{w.durationSeconds}s</span>
                      </button>
                    ))}
                  </div>
                </div>
                <ul className="space-y-2">
                  {warmups.map((w, i) => (
                    <li key={`${w.warmupId}-${i}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                      <span className="flex-1 text-white">{w.name}</span>
                      <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => {
                        const next = [...warmups]
                        ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                        setWarmups(next)
                      }}>↑</Button>
                      <Button variant="ghost" size="sm" disabled={i === warmups.length - 1} onClick={() => {
                        const next = [...warmups]
                        ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                        setWarmups(next)
                      }}>↓</Button>
                      <Button variant="ghost" size="sm" className="text-rose-300" onClick={() => setWarmups(warmups.filter((_, idx) => idx !== i))}>Remove</Button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-200">Default stretches</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <Input placeholder="Search stretches…" value={stretchSearch} onChange={(e) => setStretchSearch(e.target.value)} />
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
                    {filteredStretches.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/10"
                        onClick={() => {
                          if (stretches.some((x) => x.stretchId === s.id)) return
                          setStretches([
                            ...stretches,
                            {
                              id: 0,
                              stretchId: s.id,
                              name: s.name,
                              description: s.description,
                              videoUrl: s.videoUrl,
                              durationSeconds: s.durationSeconds,
                              bodyPart: s.bodyPart,
                              displayOrder: stretches.length + 1,
                            },
                          ])
                        }}
                      >
                        <span>{s.name}</span>
                        <span className="text-xs text-slate-500">{s.durationSeconds}s</span>
                      </button>
                    ))}
                  </div>
                </div>
                <ul className="space-y-2">
                  {stretches.map((s, i) => (
                    <li key={`${s.stretchId}-${i}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                      <span className="flex-1 text-white">{s.name}</span>
                      <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => {
                        const next = [...stretches]
                        ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                        setStretches(next)
                      }}>↑</Button>
                      <Button variant="ghost" size="sm" disabled={i === stretches.length - 1} onClick={() => {
                        const next = [...stretches]
                        ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                        setStretches(next)
                      }}>↓</Button>
                      <Button variant="ghost" size="sm" className="text-rose-300" onClick={() => setStretches(stretches.filter((_, idx) => idx !== i))}>Remove</Button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="flex justify-end">
              <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
                Save category
              </Button>
            </div>
          </div>
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
