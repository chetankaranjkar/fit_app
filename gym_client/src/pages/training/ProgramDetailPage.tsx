import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { programsService } from '../../services/workoutPlans.service'
import type { ProgramWeekDto } from '../../types/workoutPlan'
import { WeekScheduleTab, toStructurePayload } from './program/WeekScheduleTab'

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

const tabs = [
  'Overview',
  'Weekly Schedule',
  'Exercises',
  'Assigned Members',
  'Analytics',
  'Progress',
] as const

function tabClass(active: boolean) {
  return `rounded-xl px-4 py-2 text-sm font-medium transition ${
    active
      ? 'bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] text-white shadow-lg shadow-purple-500/20'
      : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
  }`
}

export function ProgramDetailPage() {
  const { userName } = getDashboardUser()
  const { programId } = useParams<{ programId: string }>()
  const id = Number(programId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')

  const { data: program, isLoading } = useQuery({
    queryKey: ['program', id],
    queryFn: async () => {
      const { data } = await programsService.getById(id)
      return data
    },
    enabled: Number.isInteger(id) && id > 0,
  })

  const [localWeeks, setLocalWeeks] = useState<ProgramWeekDto[] | null>(null)

  const weeks = localWeeks ?? program?.weeks ?? []
  const setWeeks = useCallback((w: ProgramWeekDto[]) => setLocalWeeks(w), [])

  useEffect(() => {
    if (program?.weeks?.length) setLocalWeeks(program.weeks)
  }, [program?.id, program?.weeks])

  const saveStructureMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toStructurePayload>) =>
      programsService.saveStructure(id, payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['program', id] })
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
    },
  })

  const cloneMutation = useMutation({
    mutationFn: () => programsService.clone(id, {}).then((r) => r.data),
    onSuccess: (newPlan) => {
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
      navigate(`/dashboard/training/programs/${newPlan.id}`)
    },
  })

  const aiSuggest = useCallback(() => {
    const g = program?.goal?.toLowerCase() ?? ''
    if (!weeks.length || weeks[0].days.length < 3) return
    const w = weeks[0]
    const nextDays = w.days.map((d, i) => {
      if (d.isRestDay) return d
      let focus = d.focusArea ?? 'Full body'
      if (g.includes('fat') || g.includes('hiit')) focus = i % 2 === 0 ? 'Metabolic circuit' : 'Strength maintenance'
      else if (g.includes('strength')) focus = ['Squat', 'Bench', 'Rest', 'Deadlift', 'OHP', 'Accessory', 'Rest'][i] ?? focus
      else if (g.includes('muscle')) focus = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Rest', 'Rest'][i] ?? focus
      return { ...d, focusArea: focus }
    })
    setLocalWeeks([{ ...w, days: nextDays }, ...weeks.slice(1)])
  }, [program?.goal, weeks])

  const exerciseAgg = useMemo(() => {
    if (!program) return { totalSets: 0, muscles: new Set<string>(), estMin: 0 }
    const lines = program.weeks?.flatMap((w) => w.days.flatMap((d) => d.exercises)) ?? program.exercises
    let totalSets = 0
    let estSec = 0
    const muscles = new Set<string>()
    for (const e of lines) {
      totalSets += e.sets
      estSec += e.sets * (45 + e.restBetweenSets)
      if (e.bodyPartName) muscles.add(e.bodyPartName)
    }
    return { totalSets, muscles, estMin: Math.round(estSec / 60) }
  }, [program])

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <DashboardLayout userName={userName}>
        <p className="p-6 text-slate-400">Invalid program.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Training · Programs"
        titleGradient={program?.name ?? 'Program'}
        subtitle={program?.description ?? 'Loading program details…'}
        showExport={false}
        primaryAction={
          program
            ? {
                label: 'Export / Print',
                onClick: () => window.print(),
              }
            : undefined
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <Link
            to="/dashboard/training/programs"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            ← Library
          </Link>
          <Button variant="soft" size="sm" onClick={() => cloneMutation.mutate()} isLoading={cloneMutation.isPending}>
            Clone program
          </Button>
          <Link
            to={`/dashboard/training/workout-assignments?highlightProgram=${id}`}
            className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15"
          >
            Assign members
          </Link>
          <Link
            to={`/dashboard/training/workout-plan-builder`}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            Open Program Builder
          </Link>
        </div>

        {isLoading || !program ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-2 print:hidden">
              {tabs.map((t) => (
                <button key={t} type="button" className={tabClass(tab === t)} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {tab === 'Overview' && (
                  <div className="space-y-6">
                    <div
                      className="relative overflow-hidden rounded-3xl border border-white/10 bg-cover bg-center p-8"
                      style={{
                        backgroundImage: program.thumbnail
                          ? `linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0.6)),url(${program.thumbnail})`
                          : undefined,
                        backgroundColor: program.thumbnail ? undefined : 'rgba(30,27,75,0.4)',
                      }}
                    >
                      <div className="relative max-w-2xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/90">
                          {program.goal ?? program.workoutType}
                        </p>
                        <h2 className="text-2xl font-bold text-white">{program.name}</h2>
                        <p className="text-sm text-slate-300">{program.description || 'Premium program template.'}</p>
                        <div className="flex flex-wrap gap-3 pt-2">
                          <span className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white">
                            {program.durationDays ?? '—'} days
                          </span>
                          <span className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white">
                            {program.difficultyLevel}
                          </span>
                          <span className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white">
                            {program.workoutsPerWeek ?? '—'}× / week
                          </span>
                          {program.estimatedCaloriesBurn != null && (
                            <span className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white">
                              ~{program.estimatedCaloriesBurn} kcal / session
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        {
                          label: 'Assigned members',
                          value: program.assignedMembersCount ?? 0,
                          accent: 'from-cyan-500 to-blue-500',
                        },
                        {
                          label: 'Completion (sessions)',
                          value: `${program.completionRatePercent ?? 0}%`,
                          accent: 'from-emerald-500 to-teal-500',
                        },
                        {
                          label: 'Avg session',
                          value: `${program.duration} min`,
                          accent: 'from-violet-500 to-fuchsia-500',
                        },
                        {
                          label: 'Status',
                          value: program.status ?? 'Active',
                          accent: 'from-amber-500 to-orange-500',
                        },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="glass-card rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10"
                        >
                          <p className="text-xs text-slate-400">{card.label}</p>
                          <p
                            className={`mt-1 text-2xl font-bold bg-gradient-to-br ${card.accent} bg-clip-text text-transparent`}
                          >
                            {card.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completion pulse</p>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, program.completionRatePercent ?? 0)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Based on completed workout sessions logged for this program.</p>
                    </div>
                  </div>
                )}

                {tab === 'Weekly Schedule' && (
                  <WeekScheduleTab
                    weeks={weeks}
                    onWeeksChange={setWeeks}
                    onSave={(payload) => {
                      saveStructureMutation.mutate(payload)
                      return Promise.resolve()
                    }}
                    isSaving={saveStructureMutation.isPending}
                    aiSuggest={aiSuggest}
                  />
                )}

                {tab === 'Exercises' && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs text-slate-400">Total sets</p>
                        <p className="text-xl font-semibold text-white">{exerciseAgg.totalSets}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs text-slate-400">Est. training time</p>
                        <p className="text-xl font-semibold text-white">~{exerciseAgg.estMin} min</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs text-slate-400">Muscles targeted</p>
                        <p className="text-sm font-medium text-white">{[...exerciseAgg.muscles].join(', ') || '—'}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {(program.weeks?.flatMap((w) => w.days) ?? [])
                        .filter((d) => !d.isRestDay)
                        .map((d) => (
                          <div
                            key={d.id}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-500/25"
                          >
                            <p className="font-medium text-white">{d.dayName}</p>
                            <ul className="mt-2 space-y-2 text-sm text-slate-300">
                              {d.exercises.map((e) => (
                                <li key={e.id} className="flex justify-between gap-2 border-b border-white/5 pb-2 last:border-0">
                                  <span>{e.exerciseName}</span>
                                  <span className="text-slate-500">
                                    {e.sets}×{e.reps}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {tab === 'Assigned Members' && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
                    <p className="text-sm">
                      {program.assignedMembersCount ?? 0} active assignment(s) linked in schedules.
                    </p>
                    <Link
                      to={`/dashboard/training/workout-assignments?highlightProgram=${id}`}
                      className="mt-4 inline-block text-cyan-300 underline-offset-2 hover:underline"
                    >
                      Manage assignments
                    </Link>
                  </div>
                )}

                {tab === 'Analytics' && (
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
                    <p>
                      Trainer dashboard for adherence, volume load, and RPE trends will plug into your analytics pipeline.
                    </p>
                    <p className="text-slate-500">
                      Placeholder: surface completion {program.completionRatePercent ?? 0}% and member engagement from operational
                      reports.
                    </p>
                  </div>
                )}

                {tab === 'Progress' && (
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
                    <p>Progression tracking ties workout logs to planned mesocycles (week blocks).</p>
                    <p className="text-slate-500">
                      Connect personal records from member profiles as sessions complete for this program template.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
