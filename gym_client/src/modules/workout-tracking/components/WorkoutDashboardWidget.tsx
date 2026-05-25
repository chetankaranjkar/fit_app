import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Dumbbell, Flame, TrendingUp } from 'lucide-react'
import { GlassPanel } from '../../../components/dashboard/premium/GlassPanel'
import { workoutTrackingService } from '../../../services/workoutTracking.service'
import { useMemberId } from '../hooks/useMemberId'

export function WorkoutDashboardWidget() {
  const { data: memberId, isLoading: loadingMember } = useMemberId()
  const { data: dash, isLoading } = useQuery({
    queryKey: ['workout-dashboard', memberId],
    queryFn: async () => {
      const { data } = await workoutTrackingService.dashboard(memberId!)
      return data
    },
    enabled: memberId != null,
  })

  if (loadingMember || isLoading || !dash) {
    return (
      <GlassPanel role="member" title="Workout stats" subtitle="Loading…">
        <div className="h-20 animate-pulse rounded-xl bg-white/5" />
      </GlassPanel>
    )
  }

  const last = dash.lastWorkoutDateUtc
    ? new Date(dash.lastWorkoutDateUtc).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—'

  return (
    <GlassPanel role="member" title="Workout stats" subtitle="Your training consistency">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-orange-200/80">
            <Flame className="size-3.5" /> Streak
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{dash.currentStreakDays} days</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Dumbbell className="size-3.5" /> This week
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{dash.workoutsThisWeek}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-xs text-slate-400">Last workout</p>
          <p className="mt-1 text-lg font-semibold text-white">{last}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-emerald-200/80">
            <TrendingUp className="size-3.5" /> Avg completion
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{dash.averageCompletionPercent}%</p>
        </div>
      </div>
      {dash.activeSession ? (
        <Link
          to="/dashboard/member/workouts/live"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-sm font-semibold text-black"
        >
          Resume workout ({Math.round(dash.activeSession.completionPercent)}%)
        </Link>
      ) : (
        <Link
          to="/dashboard/member/workouts/today"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-orange-400/30 bg-orange-500/15 py-2.5 text-sm font-semibold text-orange-100"
        >
          Start today&apos;s workout
        </Link>
      )}
    </GlassPanel>
  )
}
