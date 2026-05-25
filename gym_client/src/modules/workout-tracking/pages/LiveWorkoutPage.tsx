import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, History, Loader2, Timer } from 'lucide-react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { getDashboardUser } from '../../../lib/dashboardUser'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { workoutTrackingService } from '../../../services/workoutTracking.service'
import { ExerciseHistoryPanel } from '../components/ExerciseHistoryPanel'
import { useMemberId } from '../hooks/useMemberId'

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function LiveWorkoutPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: memberId } = useMemberId()
  const [historyExercise, setHistoryExercise] = useState<{ id: number; name: string } | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ['workout-active', memberId],
    queryFn: async () => {
      const { data } = await workoutTrackingService.getActive(memberId!)
      return data
    },
    enabled: memberId != null,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!session?.startTimeUtc) return
    const start = new Date(session.startTimeUtc).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.startTimeUtc])

  const logMutation = useMutation({
    mutationFn: workoutTrackingService.logSet,
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ['workout-dashboard'] })
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to save set')),
  })

  const completeMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const { data } = await workoutTrackingService.complete(sessionId)
      return data
    },
    onSuccess: () => {
      toast.success('Workout completed!')
      queryClient.invalidateQueries({ queryKey: ['workout-active'] })
      queryClient.invalidateQueries({ queryKey: ['workout-dashboard'] })
      navigate('/dashboard/member/workouts')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not complete workout')),
  })

  const progressPct = useMemo(() => session?.completionPercent ?? 0, [session])

  if (isLoading) {
    return (
      <DashboardLayout userName={userName}>
        <p className="p-8 text-center text-slate-400">Loading workout…</p>
      </DashboardLayout>
    )
  }

  if (!session) {
    return (
      <DashboardLayout userName={userName}>
        <div className="mx-auto max-w-lg p-8 text-center">
          <p className="text-slate-300">No active workout.</p>
          <Link
            to="/dashboard/member/workouts/today"
            className="mt-4 inline-block text-orange-300 hover:underline"
          >
            Start today&apos;s workout
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-2xl space-y-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Link to="/dashboard/member/workouts" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-orange-300">
            <ArrowLeft className="size-3.5" />
            Exit
          </Link>
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <Timer className="size-3.5" />
            {formatElapsed(elapsed)}
          </span>
        </div>

        <div className="rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/15 to-neutral-950 p-5">
          <p className="text-xs uppercase tracking-wider text-orange-200/80">In progress</p>
          <h1 className="mt-1 text-xl font-bold text-white">{session.planName ?? 'Workout'}</h1>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>
                {session.completedSets} / {session.totalSets} sets
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Volume: {Math.round(session.totalVolume)} kg</p>
          </div>
        </div>

        {session.exercises.map((group) => (
          <section
            key={group.exerciseId}
            className="rounded-2xl border border-white/10 bg-black/40 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-white">{group.exerciseName}</h2>
              <button
                type="button"
                onClick={() => setHistoryExercise({ id: group.exerciseId, name: group.exerciseName })}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-400 hover:text-orange-200"
              >
                <History className="size-3" />
                History
              </button>
            </div>
            <div className="space-y-3">
              {group.sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  saving={logMutation.isPending}
                  onSave={(payload) =>
                    logMutation.mutate({
                      workoutSessionExerciseId: set.id,
                      ...payload,
                    })
                  }
                />
              ))}
            </div>
          </section>
        ))}

        <button
          type="button"
          disabled={completeMutation.isPending}
          onClick={() => completeMutation.mutate(session.sessionId)}
          className="fixed bottom-6 left-1/2 z-40 flex w-[min(100%,22rem)] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-black shadow-lg disabled:opacity-60"
        >
          {completeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Complete workout
        </button>
      </div>

      {historyExercise && memberId != null ? (
        <ExerciseHistoryPanel
          memberId={memberId}
          exerciseId={historyExercise.id}
          exerciseName={historyExercise.name}
          onClose={() => setHistoryExercise(null)}
        />
      ) : null}
    </DashboardLayout>
  )
}

function SetRow({
  set,
  saving,
  onSave,
}: {
  set: {
    id: number
    setNumber: number
    targetReps: number
    targetWeight?: number | null
    actualReps?: number | null
    actualWeight?: number | null
    isCompleted: boolean
  }
  saving: boolean
  onSave: (p: { actualReps?: number; actualWeight?: number; isCompleted: boolean }) => void
}) {
  const [weight, setWeight] = useState(String(set.actualWeight ?? set.targetWeight ?? ''))
  const [reps, setReps] = useState(String(set.actualReps ?? set.targetReps ?? ''))
  const [done, setDone] = useState(set.isCompleted)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <span className="w-12 text-xs font-medium text-slate-500">Set {set.setNumber}</span>
      <label className="flex flex-col gap-0.5 text-[10px] text-slate-500">
        kg
        <input
          type="number"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-20 rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-sm text-white"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[10px] text-slate-500">
        reps
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-16 rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-sm text-white"
        />
      </label>
      <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => setDone(e.target.checked)}
          className="size-4 rounded border-white/20"
        />
        Done
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({
            actualWeight: weight === '' ? undefined : Number(weight),
            actualReps: reps === '' ? undefined : Number(reps),
            isCompleted: done,
          })
        }
        className="w-full rounded-lg border border-orange-400/30 bg-orange-500/10 py-1.5 text-xs font-medium text-orange-100 sm:w-auto sm:px-4"
      >
        Save set
      </button>
    </div>
  )
}
