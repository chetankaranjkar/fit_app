import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { attendanceService } from '../../services/attendance.service'
import { SessionTimer } from './SessionTimer'
import { WorkoutLogger } from './WorkoutLogger'

const IDLE_WARN_MS = 50 * 60 * 1000

/**
 * After a successful attendance scan: timer, idle warning (no log for 50 min), end session, workout log form.
 */
export function WorkoutSessionPanel({
  sessionId,
  sessionStartTimeUtc,
  onSessionEnded,
}: {
  sessionId: string
  sessionStartTimeUtc: string
  onSessionEnded: () => void
}) {
  const [ending, setEnding] = useState(false)
  const lastActivityMs = useRef(
    ((): number => {
      const t = Date.parse(sessionStartTimeUtc)
      return Number.isFinite(t) ? t : Date.now()
    })(),
  )
  const [, bump] = useState(0)
  const [now, setNow] = useState(Date.now())

  const touchActivity = useCallback(() => {
    lastActivityMs.current = Date.now()
    bump((n) => n + 1)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const idleMs = now - lastActivityMs.current
  const showIdleWarning = idleMs >= IDLE_WARN_MS

  const endSession = async () => {
    setEnding(true)
    try {
      await attendanceService.endSession(sessionId)
      toast.success('Session ended.')
      onSessionEnded()
    } catch {
      toast.error('Could not end session.')
    } finally {
      setEnding(false)
    }
  }

  return (
    <div className="mt-6 space-y-4 text-left">
      <p className="text-center text-sm font-medium text-emerald-200">Session started</p>
      <SessionTimer startedAtUtc={sessionStartTimeUtc} />

      {showIdleWarning && (
        <div
          role="status"
          className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100"
        >
          Session will end soon: no activity for 50 minutes. Log a set or end the session.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" className="flex-1" isLoading={ending} onClick={() => void endSession()}>
          End session
        </Button>
      </div>

      <WorkoutLogger sessionId={sessionId} onLogged={touchActivity} />
    </div>
  )
}
