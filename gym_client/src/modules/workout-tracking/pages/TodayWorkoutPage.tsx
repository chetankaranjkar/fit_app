import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Dumbbell, Loader2, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { GlassPanel } from '../../../components/dashboard/premium/GlassPanel'
import { getDashboardUser } from '../../../lib/dashboardUser'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { meService } from '../../../services/me.service'
import { workoutTrackingService } from '../../../services/workoutTracking.service'
import { WorkoutDashboardWidget } from '../components/WorkoutDashboardWidget'
import { useMemberId } from '../hooks/useMemberId'

export function TodayWorkoutPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const planIdParam = params.get('planId')
  const queryClient = useQueryClient()
  const { data: memberId } = useMemberId()

  const { data: program, isLoading } = useQuery({
    queryKey: ['member-workout-program'],
    queryFn: async () => {
      const { data } = await meService.getWorkoutProgram()
      return data
    },
  })

  const planId = planIdParam ? Number(planIdParam) : program?.programs?.[0]?.plan?.id
  const plan = program?.programs?.find((p) => p.plan.id === planId)?.plan

  const { data: active } = useQuery({
    queryKey: ['workout-active', memberId],
    queryFn: async () => {
      try {
        const data = await workoutTrackingService.getActiveSession(memberId!)
        return data
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) return null
        throw err
      }
    },
    enabled: memberId != null,
  })

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!memberId || !planId) throw new Error('Missing member or plan')
      const offset = -new Date().getTimezoneOffset()
      const { data } = await workoutTrackingService.start({
        memberId,
        workoutPlanId: planId,
        utcOffsetMinutes: offset,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-active'] })
      queryClient.invalidateQueries({ queryKey: ['workout-dashboard'] })
      navigate('/dashboard/member/workouts/live')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not start workout')),
  })

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-2xl space-y-6 pb-16">
        <Link
          to="/dashboard/member/workouts"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-300"
        >
          <ArrowLeft className="size-3.5" />
          Back to workouts
        </Link>

        <header className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/15 text-orange-300">
            <Dumbbell className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">Today&apos;s workout</h1>
            <p className="text-sm text-slate-400">{plan?.planName ?? 'Your assigned program'}</p>
          </div>
        </header>

        <WorkoutDashboardWidget />

        <GlassPanel role="member" title="Ready to train?" subtitle="Log sets, reps, and weight as you go">
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading plan…</p>
          ) : !planId ? (
            <p className="text-sm text-rose-300">No workout plan assigned.</p>
          ) : active ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                You have a workout in progress ({Math.round(active.completionPercent)}% complete).
              </p>
              <Link
                to="/dashboard/member/workouts/live"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-semibold text-black"
              >
                <Play className="size-4" />
                Resume workout
              </Link>
            </div>
          ) : (
            <button
              type="button"
              disabled={startMutation.isPending || memberId == null}
              onClick={() => startMutation.mutate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {startMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
              Start workout
            </button>
          )}
        </GlassPanel>
      </div>
    </DashboardLayout>
  )
}
