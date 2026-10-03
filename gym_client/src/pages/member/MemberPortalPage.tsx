/**
 * Member home: standing, today’s next action, assigned targets vs recorded activity.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { MemberLoadError, MemberLoadingState } from '../../components/member/MemberQueryState'
import { MemberStandingSummary } from '../../components/member/MemberStandingSummary'
import { MemberTodayActionCard } from '../../components/member/MemberTodayActionCard'
import { getDashboardUser } from '../../lib/dashboardUser'
import { deriveMembershipStanding } from '../../lib/membershipStanding'
import {
  findTodayAssignedWorkout,
  resolveMemberTodayAction,
} from '../../lib/memberPortalNextAction'
import { commercialService } from '../../services/commercial.service'
import { meService } from '../../services/me.service'

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MemberPortalPage() {
  const { userName } = getDashboardUser()

  const dashQuery = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: async () => (await meService.getDashboard()).data,
    retry: false,
  })

  const payQuery = useQuery({
    queryKey: ['member-online-payment-summary'],
    queryFn: async () => (await commercialService.getOnlinePaymentSummary()).data,
    retry: false,
  })

  const dietQuery = useQuery({
    queryKey: ['member-diet-plan'],
    queryFn: () => meService.getDietPlan(),
    retry: false,
  })

  const programQuery = useQuery({
    queryKey: ['member-workout-program'],
    queryFn: async () => (await meService.getWorkoutProgram()).data,
    retry: false,
  })

  const dash = dashQuery.data
  const pay = payQuery.data
  const diet = dietQuery.data
  const programs = programQuery.data?.programs ?? []

  const standing =
    dash || pay
      ? deriveMembershipStanding({
          status: pay?.membershipStatus ?? dash?.membership?.status,
          planName: pay?.planName ?? dash?.membership?.planName,
          startDate: dash?.membership?.startDate,
          endDate: pay?.membershipEndDate ?? dash?.membership?.endDate,
          outstanding: pay != null ? pay.outstandingAmount : null,
          billingStatus:
            pay?.paymentNeed === 'settle_outstanding'
              ? pay.outstandingAmount > 0
                ? 'Pending'
                : undefined
              : pay?.paymentNeed === 'nothing_due'
                ? 'Paid'
                : undefined,
        })
      : null

  const todayAssigned = findTodayAssignedWorkout(programQuery.data?.programs)
  const todayAction =
    standing &&
    resolveMemberTodayAction({
      standing,
      todayAssigned,
      hasRecordedBodyMetric: dash?.latestBodyMetric?.weight != null,
    })

  const slots = programs.flatMap((p) =>
    (p.scheduleSlots ?? []).map((s) => ({
      planName: p.plan.planName,
      scheduleType: s.scheduleType,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      trainerName: s.trainerName,
    })),
  )

  const attendanceDays = dash?.attendance?.last30Days ?? []
  const homeBusy = dashQuery.isLoading
  const homeError = dashQuery.isError ? dashQuery.error : null

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-3xl pb-20 lg:pb-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/80">Member portal</p>
          <h1 className="text-2xl font-bold text-white">Home</h1>
          <p className="text-sm text-slate-400">
            Assigned plans from your coach, plus recorded visits and payments on your own account.{' '}
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
            {' · '}
            <Link to="/dashboard/member/pay" className="text-orange-400 hover:underline">
              Payments
            </Link>
          </p>
        </header>

        {homeBusy ? (
          <MemberLoadingState label="Loading your membership and today’s plan…" />
        ) : homeError ? (
          <MemberLoadError
            error={homeError}
            fallback="Could not load your home overview."
            onRetry={() => {
              void dashQuery.refetch()
              void payQuery.refetch()
            }}
          />
        ) : (
          <>
            {todayAction ? <MemberTodayActionCard action={todayAction} /> : null}

            <GlassPanel
              role="member"
              title="Membership"
              subtitle={standing?.planName ?? 'Access, period, payment, and outstanding balance'}
            >
              {standing ? (
                <MemberStandingSummary standing={standing} />
              ) : (
                <p className="text-sm text-slate-400">No membership on file.</p>
              )}
              {payQuery.isError ? (
                <p className="mt-3 text-xs text-amber-200/90">
                  Billing details could not be loaded. Access and membership dates still use your membership record.{' '}
                  <button type="button" className="underline" onClick={() => void payQuery.refetch()}>
                    Retry billing
                  </button>
                </p>
              ) : null}
            </GlassPanel>
          </>
        )}

        <GlassPanel role="member" title="Assigned workout times" subtitle="What your coach scheduled — not recorded attendance">
          {programQuery.isLoading ? (
            <MemberLoadingState label="Loading assigned schedule…" />
          ) : programQuery.isError ? (
            <MemberLoadError
              error={programQuery.error}
              fallback="Could not load assigned workouts."
              onRetry={() => void programQuery.refetch()}
            />
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-400" data-testid="member-empty-assigned-workouts">
              No workout schedule assigned yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {slots.map((s, i) => (
                <li
                  key={`${s.planName}-${s.dayOfWeek}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2"
                >
                  <span className="font-medium text-white">{s.planName}</span>
                  <span className="text-slate-300">
                    {weekDays[s.dayOfWeek] ?? `Day ${s.dayOfWeek}`} · {s.startTime?.slice(0, 5)}–{s.endTime?.slice(0, 5)}
                  </span>
                  <span className="w-full text-xs text-slate-500">
                    Assigned · {s.scheduleType}
                    {s.trainerName ? ` · ${s.trainerName}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel role="member" title="Assigned diet plan" subtitle="Targets from your coach — not logged meals">
          {dietQuery.isLoading ? (
            <MemberLoadingState label="Loading assigned diet…" />
          ) : dietQuery.isError ? (
            <MemberLoadError
              error={dietQuery.error}
              fallback="Could not load your diet plan."
              onRetry={() => void dietQuery.refetch()}
            />
          ) : !diet ? (
            <p className="text-sm text-slate-400" data-testid="member-empty-assigned-diet">
              No diet plan assigned yet.
            </p>
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

        <GlassPanel role="member" title="Recorded check-ins" subtitle="Days with a gym visit on file — empty days are not marked missed">
          {dashQuery.isLoading ? (
            <MemberLoadingState label="Loading recorded visits…" />
          ) : dashQuery.isError ? (
            <p className="text-sm text-slate-500">Recorded visits load with your home overview. Use Try again above.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-4 text-sm">
                <span className="text-white">
                  This week: <strong>{dash?.attendance?.totalThisWeek ?? 0}</strong>
                </span>
                <span className="text-white">
                  This month: <strong>{dash?.attendance?.totalThisMonth ?? 0}</strong>
                </span>
                <span className="text-orange-300">
                  Streak: <strong>{dash?.attendance?.currentStreakDays ?? 0}</strong> days
                </span>
              </div>
              <div className="flex max-w-full flex-wrap gap-1" role="img" aria-label="Attendance last 30 days">
                {attendanceDays.map((d) => (
                  <span
                    key={d.date}
                    aria-label={`${d.date}: ${d.visited ? 'recorded visit' : 'no recorded visit'}`}
                    className={`size-5 shrink-0 rounded sm:size-6 ${
                      d.visited
                        ? 'bg-emerald-500/70 ring-1 ring-emerald-400/40'
                        : 'bg-white/5 ring-1 ring-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Green = recorded visit. Grey is not a recorded miss — only days with a check-in are stored.
              </p>
            </>
          )}
        </GlassPanel>
      </DashboardPageContent>
    </DashboardLayout>
  )
}
