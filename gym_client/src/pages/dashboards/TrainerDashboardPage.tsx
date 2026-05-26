import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { HeroStat } from '../../components/dashboard/premium/HeroStat'
import { QuickAction } from '../../components/dashboard/premium/QuickAction'
import { getDashboardUser } from '../../lib/dashboardUser'
import { authService } from '../../services/auth.service'
import { usersService } from '../../services/users.service'
import { userSchedulesService } from '../../services/userSchedules.service'
import { attendanceService } from '../../services/attendance.service'
import type { User } from '../../types/user'
import type { UserScheduleDto } from '../../types/userSchedule'
import { workoutTrackingService } from '../../services/workoutTracking.service'

export function TrainerDashboardPage() {
  const { userName } = getDashboardUser()
  const session = authService.getCurrentUser()
  const trainerId = session?.trainerId

  const { data: memberWorkouts } = useQuery({
    queryKey: ['trainer-member-workouts'],
    queryFn: async () => {
      const { data } = await workoutTrackingService.trainerMemberWorkouts(12)
      return data
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['trainer-dashboard', trainerId],
    queryFn: async () => {
      const todayStr = new Date().toISOString().slice(0, 10)
      const [usersRes, schedulesRes, attendanceRes] = await Promise.all([
        usersService.getAll(),
        userSchedulesService.getAll(),
        attendanceService.getByDateRange(todayStr, todayStr),
      ])
      const users = (usersRes.data ?? []) as User[]
      const schedules = (schedulesRes.data ?? []) as UserScheduleDto[]
      const clients = trainerId
        ? users.filter((u) => u.trainerId === trainerId && u.isActive !== false)
        : users.filter((u) => u.isActive !== false).slice(0, 20)

      const todayDow = new Date().getDay()
      const todaySessions = schedules.filter(
        (s) => (!trainerId || s.trainerId === trainerId) && s.dayOfWeek === todayDow && s.isActive
      )

      const checkedInIds = new Set(
        (attendanceRes.data ?? []).map((log) => log.userId)
      )
      const scheduledUserIds = new Set(todaySessions.map((s) => s.userId))
      const pendingCheckIns = [...scheduledUserIds].filter((id) => !checkedInIds.has(id)).length

      return {
        clients,
        todaySessions,
        pendingCheckIns,
        completionPct: clients.length
          ? Math.min(100, Math.round((todaySessions.length / Math.max(clients.length, 1)) * 100))
          : 0,
      }
    },
  })

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-[1400px] space-y-8 pb-12"
      >
        <header className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-600/20 via-red-600/10 to-transparent p-6 sm:p-8">
          <p className="text-sm text-orange-200/80">Coach workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Hey {userName.split(' ')[0]} — let&apos;s train</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat role="trainer" label="Today's sessions" numericValue={isLoading ? 0 : data?.todaySessions.length ?? 0} />
            <HeroStat role="trainer" label="Active clients" numericValue={isLoading ? 0 : data?.clients.length ?? 0} />
            <HeroStat
              role="trainer"
              label="Pending check-ins"
              numericValue={isLoading ? 0 : data?.pendingCheckIns ?? 0}
            />
            <HeroStat
              role="trainer"
              label="Plan completion"
              numericValue={isLoading ? 0 : data?.completionPct ?? 0}
              format={(n) => `${n}%`}
            />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlassPanel role="trainer" title="Today's timeline" subtitle="Scheduled classes" className="lg:col-span-2">
            <ul className="space-y-3">
              {(data?.todaySessions ?? []).slice(0, 8).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                >
                  <span className="font-medium text-white">{s.workoutPlanName || 'Session'}</span>
                  <span className="text-slate-400">
                    {s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)}
                  </span>
                </li>
              ))}
              {!data?.todaySessions?.length && (
                <li className="py-8 text-center text-sm text-slate-500">No sessions scheduled for today.</li>
              )}
            </ul>
          </GlassPanel>

          <GlassPanel role="trainer" title="Reminders" subtitle="Upcoming & alerts">
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2">
                Review client progress before evening sessions
              </li>
              <li className="rounded-lg border border-white/10 px-3 py-2">Upload workout plans for new assignments</li>
            </ul>
          </GlassPanel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel role="trainer" title="Assigned clients">
            <ul className="divide-y divide-white/5">
              {(data?.clients ?? []).slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <Link to={`/dashboard/users/${c.id}`} className="font-medium text-white hover:text-orange-300">
                    {c.firstName} {c.lastName}
                  </Link>
                  <span className="text-slate-500">{c.phone ?? c.email}</span>
                </li>
              ))}
            </ul>
            <Link to="/dashboard/users" className="mt-2 inline-block text-xs text-orange-400 hover:underline">
              All clients →
            </Link>
          </GlassPanel>

          <GlassPanel role="trainer" title="Recent client workouts" subtitle="Live tracking">
            <ul className="divide-y divide-white/5">
              {(memberWorkouts ?? []).slice(0, 6).map((w) => (
                <li key={w.sessionId} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <Link
                      to={`/dashboard/training/member-workouts/${w.memberId}`}
                      className="font-medium text-white hover:text-orange-300"
                    >
                      {w.memberName}
                    </Link>
                    <p className="text-xs text-slate-500">{w.planName ?? 'Workout'} · {w.status}</p>
                  </div>
                  <span className="text-xs text-orange-300">
                    {w.completionPercent != null ? `${Math.round(w.completionPercent)}%` : '—'}
                  </span>
                </li>
              ))}
              {!(memberWorkouts?.length) ? (
                <li className="py-6 text-center text-sm text-slate-500">No tracked workouts yet.</li>
              ) : null}
            </ul>
          </GlassPanel>

          <GlassPanel role="trainer" title="Client progress" subtitle="Focus list">
            <p className="text-sm text-slate-400">
              Track transformations and missed workouts from each client profile.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(data?.clients ?? []).slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-orange-500/15 bg-gradient-to-br from-orange-500/10 to-red-500/5 p-3"
                >
                  <p className="text-sm font-semibold text-white">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Attendance & metrics on profile</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-orange-300/80">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <QuickAction role="trainer" to="/dashboard/access/scan" label="Start session" icon={<span>▶</span>} />
            <QuickAction role="trainer" to="/dashboard/attendance" label="Mark attendance" icon={<span>✓</span>} />
            <QuickAction
              role="trainer"
              to="/dashboard/training/workout-assignments"
              label="Upload workout"
              icon={<span>⚡</span>}
            />
            <QuickAction role="trainer" to="/dashboard/diet-plans" label="Upload diet" icon={<span>◆</span>} />
            <QuickAction role="trainer" to="/dashboard/users" label="Message client" icon={<span>💬</span>} />
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
