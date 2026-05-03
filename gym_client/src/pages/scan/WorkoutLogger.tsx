import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { attendanceService } from '../../services/attendance.service'

export function WorkoutLogger({
  sessionId,
  onLogged,
}: {
  sessionId: string
  onLogged: () => void
}) {
  const [exerciseName, setExerciseName] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const repsN = Number(reps)
    const weightN = Number(weight)
    if (!exerciseName.trim()) {
      toast.error('Exercise name is required.')
      return
    }
    if (!Number.isFinite(repsN) || repsN < 0) {
      toast.error('Reps must be a valid non-negative number.')
      return
    }
    if (!Number.isFinite(weightN) || weightN < 0) {
      toast.error('Weight must be a valid non-negative number.')
      return
    }
    setBusy(true)
    try {
      await attendanceService.logWorkout({
        sessionId,
        exerciseName: exerciseName.trim(),
        reps: Math.floor(repsN),
        weight: weightN,
      })
      toast.success('Set logged.')
      setExerciseName('')
      setReps('')
      setWeight('')
      onLogged()
    } catch {
      toast.error('Could not log set.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Log a set</p>
      <Input label="Exercise" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder="e.g. Bench press" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Reps" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="8" inputMode="numeric" />
        <Input label="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="60" inputMode="decimal" />
      </div>
      <Button type="submit" size="md" className="w-full" isLoading={busy}>
        Add set
      </Button>
    </form>
  )
}
