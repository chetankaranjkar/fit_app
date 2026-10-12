import { useState } from 'react'
import { Info } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ListPagination } from '../ui/ListPagination'
import { WorkoutSessionReviewModal } from '../../modules/workout-tracking/components/WorkoutSessionReviewModal'
import { workoutStatusClass, workoutStatusLabel } from '../../modules/workout-tracking/lib/workoutSessionUi'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { workoutTrackingService } from '../../services/workoutTracking.service'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'Completed', label: 'Completed' },
  { value: 'InProgress', label: 'In progress' },
  { value: 'Skipped', label: 'Skipped' },
] as const

function formatWhen(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatVolume(volume?: number | null, complete?: boolean) {
  if (volume == null) return 'Unavailable'
  const rounded = Math.round(volume)
  return complete ? `${rounded} kg` : `${rounded} kg (partial)`
}

export function MemberWorkoutHistoryTab({ userId }: { userId: number }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('all')
  const [reviewSessionId, setReviewSessionId] = useState<number | null>(null)

  const history = useQuery({
    queryKey: ['member-workout-history', userId, page, pageSize, from, to, status],
    enabled: Number.isFinite(userId) && userId > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: () =>
      workoutTrackingService
        .memberHistory(userId, {
          page,
          pageSize,
          from: from || undefined,
          to: to || undefined,
          utcOffsetMinutes: -new Date().getTimezoneOffset(),
          status: status === 'all' ? undefined : status,
        })
        .then((response) => response.data),
  })

  const totalCount = history.data?.totalCount ?? 0

  const updateFilter = (apply: () => void) => {
    apply()
    setPage(1)
  }

  return (
    <div data-testid="member-workout-history" className="dashboard-panel rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div className="max-w-2xl">
          <h2 className="text-base font-semibold text-white">Workout history</h2>
          <p className="mt-1 text-xs text-slate-400">
            {history.isSuccess ? `${totalCount} synced workout${totalCount === 1 ? '' : 's'}` : 'Recorded workouts'} · Includes previous programs
          </p>
        </div>
        <div className="flex items-center gap-2">
        <details className="relative">
          <summary aria-label="About workout syncing" className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
            <Info size={17} aria-hidden="true" />
          </summary>
          <p className="absolute right-0 top-10 z-20 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-white/10 bg-slate-900 p-4 text-xs leading-relaxed text-slate-300 shadow-lg">
            Mobile workouts appear here after syncing, including sessions from previous program assignments. Offline logs stay on the phone until uploaded. Assigned programs are shown on Details.
          </p>
        </details>
        <button
          type="button"
          onClick={() => void history.refetch()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Refresh
        </button>
        </div>
      </div>

      <div className="workout-history-filters flex flex-wrap items-end gap-3 px-6 py-4">
        <label className="text-xs text-slate-400">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => updateFilter(() => setFrom(event.target.value))}
            className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
        <label className="text-xs text-slate-400">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => updateFilter(() => setTo(event.target.value))}
            className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
        <label className="text-xs text-slate-400">
          Status
          <select
            value={status}
            onChange={(event) => updateFilter(() => setStatus(event.target.value))}
            className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {history.isLoading ? (
        <p className="px-6 py-8 text-sm text-slate-400">Loading workout history…</p>
      ) : history.isError ? (
        <div className="px-6 py-8 text-sm text-slate-300">
          <p>{getApiErrorMessage(history.error, 'Could not load workout history.')}</p>
          <button
            type="button"
            onClick={() => void history.refetch()}
            className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      ) : totalCount === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-sm font-medium text-slate-200">No workouts recorded in this date range.</p>
          <p className="mt-2 text-xs text-slate-400">Mobile workouts appear here after syncing.</p>
        </div>
      ) : (
        <div className="px-2 pb-4 sm:px-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Sets</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {history.data?.items.map((item) => (
                  <tr key={item.sessionId} className="border-b border-white/5 align-top">
                    <td className="px-4 py-4 text-slate-200">{formatWhen(item.occurredAtUtc)}</td>
                    <td className="px-4 py-4 text-slate-300">{item.planName?.trim() || 'No program'}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${workoutStatusClass(item.status)}`}>
                        {workoutStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {item.durationMinutes != null && item.durationMinutes > 0 ? `${item.durationMinutes} min` : 'Unavailable'}
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {item.completedSets}/{item.totalSets}
                    </td>
                    <td className="px-4 py-4 text-slate-300">{formatVolume(item.totalVolume, item.volumeComplete)}</td>
                    <td className="max-w-[220px] px-4 py-4 text-slate-400">{item.notes?.trim() || '—'}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setReviewSessionId(item.sessionId)}
                        className="text-sm text-cyan-300 underline-offset-2 hover:underline"
                      >
                        View session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4">
            <ListPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              isFetching={history.isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </div>
        </div>
      )}

      <WorkoutSessionReviewModal
        sessionId={reviewSessionId}
        open={reviewSessionId != null}
        onClose={() => setReviewSessionId(null)}
      />
    </div>
  )
}
