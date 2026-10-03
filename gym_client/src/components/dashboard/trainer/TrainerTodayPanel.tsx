import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { GlassPanel } from '../premium/GlassPanel'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { memberWorkoutTimelineUrl, trainerWorkoutsReviewUrl } from '../../../lib/workoutAssignmentLinks'
import type { MemberWorkoutSummary } from '../../../types/workoutTracking'
import type {
  TrainerInferredMiss,
  TrainerToday,
  TrainerTodayClient,
  TrainerTodayPtSession,
} from '../../../types/trainerToday'

const PT_SESSIONS_PATH = '/dashboard/personal-training/sessions'
const REVIEW_WINDOW_DAYS = 7

const badgeBase = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold'
/** Recorded = solid; inferred = dashed outline so the two never read the same. */
const recordedBadge = `${badgeBase} bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40`
const recordedNegativeBadge = `${badgeBase} bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40`
const inferredPendingBadge = `${badgeBase} border border-dashed border-amber-400/60 text-amber-200`
const inferredMissedBadge = `${badgeBase} border border-dashed border-rose-400/60 text-rose-200`
const neutralBadge = `${badgeBase} bg-white/5 text-slate-300 ring-1 ring-white/10`

function hhmm(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function shortDate(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function todayErrorMessage(error: unknown): string {
  if ((error as AxiosError | undefined)?.response?.status === 404) {
    return 'No trainer profile is linked to your account. Ask an administrator to link one.'
  }
  return getApiErrorMessage(error, 'Could not load today’s coach view.')
}

function memberProfileUrl(userId: number) {
  return `/dashboard/users/${userId}`
}

function ExpectedStateBadge({ client }: { client: TrainerTodayClient }) {
  if (client.state === 'CheckedIn' && client.checkInTimeUtc) {
    return (
      <span className={recordedBadge} title="From the attendance log" data-kind="recorded">
        Checked in {hhmm(client.checkInTimeUtc)} · recorded
      </span>
    )
  }
  if (client.state === 'MissedInferred') {
    return (
      <span
        className={inferredMissedBadge}
        title={`No check-in recorded by ${client.windowEnd}. Not saved as attendance.`}
        data-kind="inferred"
      >
        Missed · inferred from schedule
      </span>
    )
  }
  return (
    <span className={inferredPendingBadge} title="Expected by schedule; no check-in recorded yet" data-kind="inferred">
      No check-in yet · inferred from schedule
    </span>
  )
}

function PtAttendanceBadge({ session, nowMs }: { session: TrainerTodayPtSession; nowMs: number }) {
  if (session.status === 'NoShow' || session.isNoShow) {
    return (
      <span className={recordedNegativeBadge} data-kind="recorded">
        No-show · recorded
      </span>
    )
  }
  if (session.attendanceRecorded) {
    return (
      <span className={recordedBadge} data-kind="recorded">
        {session.memberPresent ? (session.isLate ? 'Attended late' : 'Attended') : 'Absent'} · recorded
      </span>
    )
  }
  if (session.status === 'Completed') {
    return (
      <span className={recordedBadge} data-kind="recorded">
        Completed · recorded
      </span>
    )
  }
  if (new Date(session.scheduledEndUtc).getTime() < nowMs) {
    return (
      <span className={inferredPendingBadge} data-kind="pending">
        Ended · attendance not marked
      </span>
    )
  }
  return <span className={neutralBadge}>Booked</span>
}

type ActionItem = { key: string; label: string; to: string; tone: 'warn' | 'info' }

export function TrainerTodayPanel({
  today,
  isLoading,
  error,
  memberWorkouts,
}: {
  today?: TrainerToday
  isLoading: boolean
  error?: unknown
  memberWorkouts?: MemberWorkoutSummary[]
}) {
  const nowMs = today ? new Date(today.generatedAtUtc).getTime() : 0
  const clientIds = useMemo(() => new Set((today?.expectedToday ?? []).map((c) => c.userId)), [today])

  const checkedIn = today?.expectedToday.filter((c) => c.state === 'CheckedIn') ?? []
  const awaiting = today?.expectedToday.filter((c) => c.state === 'AwaitingCheckIn') ?? []
  const missedToday = today?.expectedToday.filter((c) => c.state === 'MissedInferred') ?? []

  const missesByMember = useMemo(() => {
    const map = new Map<number, { name: string; dates: string[] }>()
    for (const miss of today?.recentInferredMisses ?? ([] as TrainerInferredMiss[])) {
      const entry = map.get(miss.userId) ?? { name: miss.memberName, dates: [] }
      entry.dates.push(miss.localDate)
      map.set(miss.userId, entry)
    }
    return [...map.entries()]
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.dates.length - a.dates.length || a.name.localeCompare(b.name))
  }, [today])

  const toReview = useMemo(() => {
    const cutoff = nowMs - REVIEW_WINDOW_DAYS * 86_400_000
    return (memberWorkouts ?? []).filter(
      (w) => w.status === 'Completed' && new Date(w.sessionDateUtc).getTime() >= cutoff,
    )
  }, [memberWorkouts, nowMs])

  const ptUnmarked =
    today?.ptSessionsToday.filter(
      (s) =>
        !s.attendanceRecorded &&
        s.status === 'Booked' &&
        new Date(s.scheduledEndUtc).getTime() < nowMs,
    ) ?? []

  const actions: ActionItem[] = []
  if (ptUnmarked.length) {
    actions.push({
      key: 'pt-unmarked',
      label: `Mark attendance for ${ptUnmarked.length} ended PT session${ptUnmarked.length === 1 ? '' : 's'}`,
      to: PT_SESSIONS_PATH,
      tone: 'warn',
    })
  }
  for (const c of missedToday) {
    actions.push({
      key: `missed-${c.userId}`,
      label: `Follow up with ${c.memberName} — no check-in by ${c.windowEnd} (inferred)`,
      to: memberProfileUrl(c.userId),
      tone: 'warn',
    })
  }
  const repeatMissers = missesByMember.filter((m) => m.dates.length >= 2)
  for (const m of repeatMissers.slice(0, 3)) {
    actions.push({
      key: `repeat-${m.userId}`,
      label: `${m.name} has ${m.dates.length} inferred misses in ${today?.missedLookbackDays ?? 7} days`,
      to: memberProfileUrl(m.userId),
      tone: 'warn',
    })
  }
  if (toReview.length) {
    actions.push({
      key: 'review',
      label: `Review ${toReview.length} completed workout${toReview.length === 1 ? '' : 's'}`,
      to: trainerWorkoutsReviewUrl({ returnTo: '/dashboard' }),
      tone: 'info',
    })
  }

  const capacityPct = today ? Math.min(100, Math.round((today.activeClients / Math.max(today.effectiveCapacity, 1)) * 100)) : 0
  const capacityDefault = today != null && today.configuredMaxActiveClients == null

  if (error) {
    return (
      <GlassPanel role="trainer" title="Today" subtitle="Your clients, sessions and follow-ups">
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
          {todayErrorMessage(error)}
        </p>
      </GlassPanel>
    )
  }

  return (
    <section aria-label="Today" className="space-y-6" data-testid="trainer-today">
      <GlassPanel
        role="trainer"
        title="Today"
        subtitle={today ? `Your clients, sessions and follow-ups · ${shortDate(today.localDate)}` : 'Your clients, sessions and follow-ups'}
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Expected today" value={isLoading ? '…' : today?.expectedToday.length ?? 0} hint="From training schedule" />
          <Stat label="Checked in" value={isLoading ? '…' : checkedIn.length} hint="Recorded attendance" />
          <Stat label="No check-in yet" value={isLoading ? '…' : awaiting.length + missedToday.length} hint="Inferred from schedule" />
          <Stat label="PT sessions" value={isLoading ? '…' : today?.ptSessionsToday.length ?? 0} hint="Booked for today" />
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="trainer-capacity">
            <dt className="text-[11px] uppercase tracking-wider text-slate-400">Capacity</dt>
            <dd className="mt-1 text-lg font-semibold text-white">
              {isLoading || !today ? '…' : `${today.activeClients} / ${today.effectiveCapacity}`}
            </dd>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${capacityPct >= 90 ? 'bg-rose-400' : 'bg-orange-400'}`}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              {capacityDefault ? 'Gym default — no limit set on your trainer profile' : 'Max active clients on your profile'}
            </p>
          </div>
        </dl>

        <div className="mt-5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-orange-300/80">Action items</h4>
          <ul className="mt-2 space-y-2" data-testid="trainer-actions">
            {actions.map((a) => (
              <li key={a.key}>
                <Link
                  to={a.to}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition hover:bg-white/5 ${
                    a.tone === 'warn' ? 'border-amber-500/25 text-amber-50' : 'border-white/10 text-slate-200'
                  }`}
                >
                  <span>{a.label}</span>
                  <span aria-hidden className="text-orange-300">→</span>
                </Link>
              </li>
            ))}
            {!isLoading && actions.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/10 px-4 py-2.5 text-sm text-slate-500">
                Nothing needs your attention right now.
              </li>
            ) : null}
          </ul>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          <span className={recordedBadge}>recorded</span> comes from attendance logs or PT attendance marked by staff.{' '}
          <span className={inferredPendingBadge}>inferred</span> is worked out from the training schedule when no
          check-in exists — it is never saved as attendance.
        </p>
      </GlassPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel role="trainer" title="Expected today" subtitle="Assigned clients scheduled for today">
          <ul className="divide-y divide-white/5" data-testid="trainer-expected-today">
            {(today?.expectedToday ?? []).map((c) => (
              <li key={c.userId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <Link to={memberProfileUrl(c.userId)} className="font-medium text-white hover:text-orange-300">
                    {c.memberName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {c.windowStart} – {c.windowEnd}
                    {c.scheduleLabel ? ` · ${c.scheduleLabel}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <ExpectedStateBadge client={c} />
                  <Link
                    to={memberWorkoutTimelineUrl({ memberId: c.userId, returnTo: '/dashboard' })}
                    className="text-xs font-semibold text-orange-300 hover:underline"
                  >
                    Workouts
                  </Link>
                </div>
              </li>
            ))}
            {!isLoading && !today?.expectedToday.length ? (
              <li className="py-6 text-center text-sm text-slate-500">No assigned clients are scheduled for today.</li>
            ) : null}
          </ul>
          {today?.clientsWithoutSchedule ? (
            <p className="mt-2 text-xs text-slate-500">
              {today.clientsWithoutSchedule} client{today.clientsWithoutSchedule === 1 ? ' has' : 's have'} no training
              schedule, so they can&apos;t be expected or marked missed.
            </p>
          ) : null}
        </GlassPanel>

        <GlassPanel
          role="trainer"
          title="PT sessions today"
          subtitle="Personal training bookings"
          action={
            <Link to={PT_SESSIONS_PATH} className="text-xs font-semibold text-orange-300 hover:underline">
              All sessions →
            </Link>
          }
        >
          <ul className="divide-y divide-white/5" data-testid="trainer-pt-today">
            {(today?.ptSessionsToday ?? []).map((s) => (
              <li key={s.sessionId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  {clientIds.has(s.userId) ? (
                    <Link to={memberProfileUrl(s.userId)} className="font-medium text-white hover:text-orange-300">
                      {s.memberName}
                    </Link>
                  ) : (
                    <span className="font-medium text-white">{s.memberName}</span>
                  )}
                  <p className="text-xs text-slate-500">
                    {hhmm(s.scheduledStartUtc)} – {hhmm(s.scheduledEndUtc)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <PtAttendanceBadge session={s} nowMs={nowMs} />
                  <Link to={PT_SESSIONS_PATH} className="text-xs font-semibold text-orange-300 hover:underline">
                    Session
                  </Link>
                </div>
              </li>
            ))}
            {!isLoading && !today?.ptSessionsToday.length ? (
              <li className="py-6 text-center text-sm text-slate-500">No PT sessions booked for today.</li>
            ) : null}
          </ul>
        </GlassPanel>

        <GlassPanel
          role="trainer"
          title="Recent missed sessions"
          subtitle={`Last ${today?.missedLookbackDays ?? 7} days, excluding today`}
        >
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Inferred from schedule (no check-in)
          </h4>
          <ul className="mt-2 space-y-2" data-testid="trainer-inferred-misses">
            {missesByMember.slice(0, 8).map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link to={memberProfileUrl(m.userId)} className="font-medium text-white hover:text-orange-300">
                  {m.name}
                </Link>
                <span className={inferredMissedBadge} data-kind="inferred">
                  Missed (inferred) · {m.dates.map(shortDate).join(', ')}
                </span>
              </li>
            ))}
            {!isLoading && missesByMember.length === 0 ? (
              <li className="text-sm text-slate-500">No schedule-based misses.</li>
            ) : null}
          </ul>

          <h4 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            PT no-shows (recorded)
          </h4>
          <ul className="mt-2 space-y-2" data-testid="trainer-pt-noshows">
            {(today?.recentPtNoShows ?? []).map((s) => (
              <li key={s.sessionId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link to={PT_SESSIONS_PATH} className="font-medium text-white hover:text-orange-300">
                  {s.memberName}
                </Link>
                <span className={recordedNegativeBadge} data-kind="recorded">
                  No-show · recorded · {new Date(s.scheduledStartUtc).toLocaleDateString()}
                </span>
              </li>
            ))}
            {!isLoading && !today?.recentPtNoShows.length ? (
              <li className="text-sm text-slate-500">No recorded PT no-shows.</li>
            ) : null}
          </ul>
        </GlassPanel>

        <GlassPanel
          role="trainer"
          title="Workouts to review"
          subtitle={`Completed in the last ${REVIEW_WINDOW_DAYS} days`}
          action={
            <Link
              to={trainerWorkoutsReviewUrl({ returnTo: '/dashboard' })}
              className="text-xs font-semibold text-orange-300 hover:underline"
            >
              Review hub →
            </Link>
          }
        >
          <ul className="divide-y divide-white/5" data-testid="trainer-review-queue">
            {toReview.slice(0, 6).map((w) => (
              <li key={w.sessionId} className="flex items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <Link
                    to={memberWorkoutTimelineUrl({
                      memberId: w.userId || w.memberId,
                      returnTo: trainerWorkoutsReviewUrl(),
                    })}
                    className="font-medium text-white hover:text-orange-300"
                  >
                    {w.memberName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {w.planName ?? 'Workout'} · {new Date(w.sessionDateUtc).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-orange-300">
                  {w.completionPercent != null ? `${Math.round(w.completionPercent)}%` : '—'}
                </span>
              </li>
            ))}
            {toReview.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-500">No completed workouts in the last week.</li>
            ) : null}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">
            Workouts have no “reviewed” flag yet, so this lists recent completions rather than an unreviewed queue.
          </p>
        </GlassPanel>
      </div>
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <dt className="text-[11px] uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
      <p className="mt-1 text-[10px] text-slate-500">{hint}</p>
    </div>
  )
}
