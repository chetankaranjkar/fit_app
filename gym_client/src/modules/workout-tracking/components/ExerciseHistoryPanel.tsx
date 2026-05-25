import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { TrendAreaChart } from '../../../components/dashboard/premium/TrendAreaChart'
import { workoutTrackingService } from '../../../services/workoutTracking.service'

export function ExerciseHistoryPanel({
  memberId,
  exerciseId,
  exerciseName,
  onClose,
}: {
  memberId: number
  exerciseId: number
  exerciseName: string
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['workout-exercise-history', memberId, exerciseId],
    queryFn: async () => {
      const { data: payload } = await workoutTrackingService.exerciseHistory(memberId, exerciseId)
      return payload
    },
  })

  const chartData =
    data?.entries
      .slice()
      .reverse()
      .map((e) => ({
        label: new Date(e.workoutDateUtc).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: e.volume,
      })) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-2xl"
        role="dialog"
        aria-labelledby="history-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="history-title" className="text-lg font-semibold text-white">
              {exerciseName}
            </h2>
            <p className="text-xs text-slate-400">Exercise history</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            {data?.bestVolume != null ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-amber-200">
                <Trophy className="size-4" />
                Best set: {data.bestWeight ?? '—'} kg × {data.bestReps ?? '—'} reps (
                {Math.round(data.bestVolume)} vol)
              </p>
            ) : null}

            {chartData.length > 1 ? (
              <div className="mt-4">
                <TrendAreaChart data={chartData} role="member" height={160} valueFormatter={(v) => `${v} kg`} />
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Set</th>
                    <th className="py-2 pr-3">Weight</th>
                    <th className="py-2 pr-3">Reps</th>
                    <th className="py-2">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.entries ?? []).map((e, i) => (
                    <tr key={`${e.sessionId}-${e.setNumber}-${i}`} className="border-b border-white/5 text-slate-200">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(e.workoutDateUtc).toLocaleDateString()}
                        {e.isPersonalRecord ? (
                          <span className="ml-1 text-[10px] font-bold text-amber-400">PR</span>
                        ) : null}
                        {e.isImprovement ? (
                          <span className="ml-1 text-[10px] text-emerald-400">↑</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">{e.setNumber}</td>
                      <td className="py-2 pr-3">{e.weight ?? '—'}</td>
                      <td className="py-2 pr-3">{e.reps ?? '—'}</td>
                      <td className="py-2">{Math.round(e.volume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data?.entries.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No logged sets yet.</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
