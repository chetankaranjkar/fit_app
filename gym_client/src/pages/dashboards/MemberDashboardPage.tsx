import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { HeroStat } from '../../components/dashboard/premium/HeroStat'
import { TrendAreaChart } from '../../components/dashboard/premium/TrendAreaChart'
import { getDashboardUser } from '../../lib/dashboardUser'
import { meService } from '../../services/me.service'
import { WorkoutDashboardWidget } from '../../modules/workout-tracking'

export function MemberDashboardPage() {
  const { userName } = getDashboardUser()
  const { data: dash, isLoading } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: async () => {
      const { data } = await meService.getDashboard()
      return data
    },
  })

  const firstName = dash?.profile?.firstName || userName.split(' ')[0] || 'Athlete'
  const streak = dash?.attendance?.currentStreakDays ?? 0
  const membership = dash?.membership
  const weight = dash?.latestBodyMetric?.weight

  const attendanceChart =
    dash?.attendance?.last30Days?.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric' }),
      value: d.visited ? 1 : 0,
    })) ?? []

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-[1200px] space-y-8 pb-16">
        <header className="relative overflow-hidden rounded-3xl border border-orange-500/25 bg-gradient-to-br from-neutral-950 via-orange-950/40 to-neutral-950 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 top-0 size-48 rounded-full bg-orange-500/25 blur-3xl" />
          <p className="text-sm text-orange-200/70">Your fitness journey</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {isLoading ? '…' : `Hey ${firstName}`}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-100">
              {membership ? `${membership.planName} · ${membership.daysRemaining}d left` : 'No active plan'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              🔥 {streak} day streak
            </span>
            <Link
              to="/dashboard/member/portal"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Web overview
            </Link>
            <Link
              to="/dashboard/access/scan"
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-orange-500/30 transition-transform duration-200 hover:scale-[1.02]"
            >
              QR check-in
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3"
          >
            <HeroStat role="member" label="This week" numericValue={dash?.attendance?.totalThisWeek ?? 0} />
            <HeroStat role="member" label="This month" numericValue={dash?.attendance?.totalThisMonth ?? 0} />
            <HeroStat
              role="member"
              label="Weight"
              value={weight != null ? `${weight} kg` : '—'}
            />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlassPanel role="member" title="Today's workout" subtitle="From your plan" className="lg:col-span-2">
            {(dash?.upcomingSchedule ?? []).length ? (
              <ul className="space-y-3">
                {dash!.upcomingSchedule.slice(0, 3).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{s.title}</p>
                      <p className="text-xs text-slate-400">
                        {s.dayOfWeek} · {s.trainerName ?? 'Trainer'}
                      </p>
                    </div>
                    <span className="text-sm text-orange-300">
                      {s.startTime?.slice(0, 5)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-sm text-slate-400">No workout scheduled — open Workouts to view your plan.</p>
            )}
            <Link
              to="/dashboard/member/workouts"
              className="mt-4 inline-block text-xs font-medium text-orange-400 hover:underline"
            >
              View workout plan →
            </Link>
          </GlassPanel>

          <GlassPanel role="member" title="Daily goals" subtitle="Stay on track">
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span className="text-slate-400">Water</span><span className="text-white">6 / 8 glasses</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Protein</span><span className="text-white">— g</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Calories</span><span className="text-white">— kcal</span></li>
            </ul>
            <Link to="/dashboard/member/diet" className="mt-4 inline-block text-xs text-orange-400 hover:underline">
              Open diet →
            </Link>
          </GlassPanel>
        </div>

        <WorkoutDashboardWidget />

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel role="member" title="Attendance" subtitle="Last 30 days">
            {attendanceChart.length ? (
              <TrendAreaChart role="member" data={attendanceChart} height={180} />
            ) : (
              <p className="text-sm text-slate-500">Start checking in to build your streak.</p>
            )}
          </GlassPanel>
          <GlassPanel role="member" title="Progress" subtitle="Body metrics">
            <p className="text-3xl font-bold text-white">{weight != null ? `${weight} kg` : 'Log weight'}</p>
            <p className="mt-2 text-xs text-slate-400">
              BMI {dash?.latestBodyMetric?.bmi != null ? dash.latestBodyMetric.bmi.toFixed(1) : '—'}
            </p>
            <Link to="/dashboard/member/progress" className="mt-4 inline-block text-xs text-orange-400 hover:underline">
              Full progress →
            </Link>
          </GlassPanel>
        </div>

        <GlassPanel role="member" title="Coach tips" subtitle="Personalized for you">
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">
              Consistency beats intensity — show up today.
            </article>
            <article className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              {(dash?.recentNotifications ?? [])[0]?.message ??
                'Your trainer will share updates here.'}
            </article>
          </div>
        </GlassPanel>
      </div>
    </DashboardLayout>
  )
}
