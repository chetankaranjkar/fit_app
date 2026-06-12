import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { getDashboardUser } from '../../lib/dashboardUser'
import { exercisesService } from '../../services/exercises.service'
import { personalWorkoutPlansService } from '../../services/personalWorkoutPlans.service'
import type { ProgramWeekDto, SaveProgramStructureDto } from '../../types/workoutPlan'
import { WeekScheduleTab } from '../training/program/WeekScheduleTab'

export function MemberPersonalPlanEditPage() {
  const { userName } = getDashboardUser()
  const { planId } = useParams<{ planId: string }>()
  const id = Number(planId)
  const queryClient = useQueryClient()

  const { data: plan, isLoading } = useQuery({
    queryKey: ['member-personal-plan', id],
    queryFn: async () => {
      const { data } = await personalWorkoutPlansService.getMine(id)
      return data
    },
    enabled: Number.isInteger(id) && id > 0,
  })

  const { data: exerciseLibrary = [] } = useQuery({
    queryKey: ['exercises-picker'],
    queryFn: async () => {
      const { data } = await exercisesService.getPaged({ page: 1, pageSize: 200 })
      return data.items ?? []
    },
  })

  const [localWeeks, setLocalWeeks] = useState<ProgramWeekDto[] | null>(null)
  const weeks = localWeeks ?? plan?.weeks ?? []
  const setWeeks = useCallback((w: ProgramWeekDto[]) => setLocalWeeks(w), [])

  const orphanExercises = useMemo(() => {
    if (!plan) return []
    if (!plan.weeks?.length) return plan.exercises
    const onDay = new Set(
      plan.weeks.flatMap((w) => w.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))),
    )
    return plan.exercises.filter((e) => !e.workoutPlanDayId && !onDay.has(e.exerciseId))
  }, [plan])

  useEffect(() => {
    if (plan?.weeks?.length) setLocalWeeks(plan.weeks)
  }, [plan?.id, plan?.weeks])

  const saveMutation = useMutation({
    mutationFn: (payload: SaveProgramStructureDto) =>
      personalWorkoutPlansService.saveStructure(id, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Plan schedule saved')
      void queryClient.invalidateQueries({ queryKey: ['member-personal-plan', id] })
      void queryClient.invalidateQueries({ queryKey: ['member-personal-plans'] })
      void queryClient.invalidateQueries({ queryKey: ['member-workout-program'] })
    },
    onError: () => toast.error('Could not save schedule'),
  })

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <DashboardLayout userName={userName}>
        <p className="p-6 text-slate-400">Invalid plan.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-5xl pb-16">
        <Link
          to="/dashboard/member/workouts"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-orange-300"
        >
          <ArrowLeft className="size-3.5" />
          Back to workouts
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">{plan?.name ?? 'My plan'}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Build your weekly schedule. Changes are saved to your personal plan.
          </p>
        </header>

        {isLoading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
        ) : (
          <WeekScheduleTab
            weeks={weeks}
            onWeeksChange={setWeeks}
            onSave={(payload) => {
              saveMutation.mutate(payload)
              return Promise.resolve()
            }}
            isSaving={saveMutation.isPending}
            aiSuggest={() => undefined}
            exerciseLibrary={exerciseLibrary}
            workoutsPerWeek={plan?.workoutsPerWeek ?? 4}
            orphanExercises={orphanExercises}
          />
        )}
      </DashboardPageContent>
    </DashboardLayout>
  )
}
