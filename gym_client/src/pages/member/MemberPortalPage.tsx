/**
 * Minimal read-only member web portal (schedule, diet summary, attendance).
 * For members who prefer a single browser page over drilling into separate tabs.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { getDashboardUser } from '../../lib/dashboardUser'
import { meService } from '../../services/me.service'

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MemberPortalPage() {
  const { userName } = getDashboardUser()

  const dashQuery = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: async () => (await meService.getDashboard()).data,
  })

  const dietQuery = useQuery({
    queryKey: ['member-diet-plan'],
    queryFn: async () => {
      try {
        const { data } = await meService.getDietPlan()
        return data
      } catch {
        return null
      }
    },
  })

  const programQuery = useQuery({
    queryKey: ['member-workout-program'],
    queryFn: async () => {
      try {
        const { data } = await meService.getWorkoutProgram()
        return data
      } catch {
        return null
      }
    },
  })

  const dash = dashQuery.data
  const diet = dietQuery.data
  const programs = programQuery.data?.programs ?? []

  const slots =
    programs.flatMap((p) =>
      (p.scheduleSlots ?? []).map((s) => ({
        planName: p.plan.planName,
        scheduleType: s.scheduleType,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        trainerName: s.trainerName,
      })),
    ) ?? []

  const attendanceDays = dash?.attendance?.last30Days ?? []

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6 pb-20 lg:pb-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/80">
            Member portal
          </p>
          <h1 className="text-2xl font-bold text-white">Your overview</h1>
          <p className="text-sm text-slate-400">
            Read-only summary — works in any browser.{' '}
            <Link to="/dashboard/member/workouts" className="text-orange-400 hover:underline">
              Workouts
            </Link>
            {' · '}
            <Link to="/dashboard/member/diet" className="text-orange-400 hover:underline">
              Diet
            </Link>
            {' · '}
            <Link to="/dashboard/member/progress" className="text-orange-400 hover:underline">
              Progress
            </Link>
          </p>
        </header>

        <GlassPanel role="member" title="Schedule" subtitle="Assigned workout times">
          {programQuery.isLoading ? (
            <p className="text-sm text-slate-400">Loading schedule…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-400">No workout schedule assigned yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {slots.map((s, i) => (
                <li
                  key={`${s.planName}-${s.dayOfWeek}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2"
                >
                  <span className="font-medium text-white">{s.planName}</span>
                  <span className="text-slate-300">
                    {weekDays[s.dayOfWeek] ?? `Day ${s.dayOfWeek}`} ·{' '}
                    {s.startTime?.slice(0, 5)}–{s.endTime?.slice(0, 5)}
                  </span>
                  <span className="w-full text-xs text-slate-500">
                    {s.scheduleType}
                    {s.trainerName ? ` · ${s.trainerName}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {dash?.upcomingSchedule?.length ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Also on your home feed
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                {dash.upcomingSchedule.map((s) => (
                  <li key={s.id}>
                    {s.title} — {s.dayOfWeek ?? '—'} {s.startTime?.slice(0, 5)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </GlassPanel>

        <GlassPanel role="member" title="Diet" subtitle="Active plan summary">
          {dietQuery.isLoading ? (
            <p className="text-sm text-slate-400">Loading diet…</p>
          ) : !diet ? (
            <p className="text-sm text-slate-400">No diet plan assigned.</p>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Plan</dt>
                <dd className="font-medium text-white">{diet.planName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Goal</dt>
                <dd className="text-white">{diet.goalType}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Calories</dt>
                <dd className="text-white">{diet.calories} kcal</dd>
              </div>
              <div>
                <dt className="text-slate-500">Dates</dt>
                <dd className="text-white">
                  {new Date(diet.startDate).toLocaleDateString()}
                  {diet.endDate ? ` → ${new Date(diet.endDate).toLocaleDateString()}` : ''}
                </dd>
              </div>
            </dl>
          )}
        </GlassPanel>

        <GlassPanel role="member" title="Attendance" subtitle="Last 30 days check-ins">
          {dashQuery.isLoading ? (
            <p className="text-sm text-slate-400">Loading attendance…</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-4 text-sm">
                <span className="text-white">
                  This week:{' '}
                  <strong>{dash?.attendance?.totalThisWeek ?? 0}</strong>
                </span>
                <span className="text-white">
                  This month:{' '}
                  <strong>{dash?.attendance?.totalThisMonth ?? 0}</strong>
                </span>
                <span className="text-orange-300">
                  Streak: <strong>{dash?.attendance?.currentStreakDays ?? 0}</strong> days
                </span>
              </div>
              <div className="flex max-w-full flex-wrap gap-1">
                {attendanceDays.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.visited ? 'Visited' : '—'}`}
                    className={`size-5 shrink-0 rounded sm:size-6 ${
                      d.visited
                        ? 'bg-emerald-500/70 ring-1 ring-emerald-400/40'
                        : 'bg-white/5 ring-1 ring-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Green = day with a recorded visit. Full history stays with your gym records.
              </p>
            </>
          )}
        </GlassPanel>

        <Link to="/dashboard" className="inline-block text-sm text-orange-400 hover:underline">
          ← Back to home
        </Link>
      </div>
    </DashboardLayout>
  )
}
