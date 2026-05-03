import { motion } from 'framer-motion'
import { CheckCircle2, DoorOpen, XCircle } from 'lucide-react'
import type { AttendanceScanResponseDto } from '../../types/qr'
import { Button } from '../../components/ui/Button'
import { WorkoutSessionPanel } from './WorkoutSessionPanel'

export function ScanResult({
  outcome,
  onReset,
}: {
  outcome: AttendanceScanResponseDto
  onReset: () => void
}) {
  const ok = outcome.success

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.05] px-8 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
    >
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full ring-2 ring-offset-4 ring-offset-slate-950/80 bg-gradient-to-br from-transparent to-transparent">
        {ok ? (
          <CheckCircle2 className="size-10 text-emerald-400" aria-hidden />
        ) : (
          <XCircle className="size-10 text-rose-400" aria-hidden />
        )}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-white">
        {ok ? 'Welcome in' : 'Check-in declined'}
      </h2>
      <p className="mt-2 text-sm text-slate-400">{outcome.message}</p>

      {!ok && outcome.errorCode === 'rate_limited' && (
        <p className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-left text-xs leading-relaxed text-amber-100/95">
          The server limits how often you can check in (5 successful scans per rolling minute per account). Wait a
          short time, then scan again.
        </p>
      )}

      {!ok && outcome.errorCode === 'replay' && (
        <p className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-left text-xs leading-relaxed text-amber-100/95">
          Replay protection: the same scan attempt cannot be accepted twice within about 2 minutes. Your app sends a
          new id on each scan — if you still see this, refresh the page or ask staff to show a freshly rotated QR.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/5 bg-black/35 px-4 py-4 text-xs text-slate-300">
        <DoorOpen className="size-5 text-cyan-300" aria-hidden />
        <span>
          Door pulse:{' '}
          {!outcome.doorUnlockAttempted
            ? 'skipped'
            : outcome.doorUnlockOk
              ? 'device OK'
              : 'device offline / misconfigured'}
        </span>
      </div>

      {ok && outcome.sessionId && outcome.sessionStartTimeUtc && (
        <WorkoutSessionPanel
          sessionId={outcome.sessionId}
          sessionStartTimeUtc={outcome.sessionStartTimeUtc}
          onSessionEnded={onReset}
        />
      )}

      <Button type="button" variant="secondary" className="mt-8 w-full" onClick={onReset}>
        Scan again
      </Button>
    </motion.div>
  )
}
