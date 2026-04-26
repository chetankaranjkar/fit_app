import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { SectionCard } from '../components/SectionCard'
import { useTrainersModuleStore } from '../store'
import type { AttendanceStatus } from '../types'

export function TrainersAttendanceSessionsTab() {
  const trainers = useTrainersModuleStore((s) => s.trainers)
  const attendance = useTrainersModuleStore((s) => s.attendance)
  const sessions = useTrainersModuleStore((s) => s.sessions)
  const markAttendance = useTrainersModuleStore((s) => s.markAttendance)
  const addSession = useTrainersModuleStore((s) => s.addSession)

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedTrainerId, setSelectedTrainerId] = useState(trainers[0]?.id ?? '')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionCount, setSessionCount] = useState(1)

  const sessionCounts = useMemo(
    () =>
      sessions.reduce<Record<string, number>>((acc, session) => {
        acc[session.trainerId] = (acc[session.trainerId] ?? 0) + session.count
        return acc
      }, {}),
    [sessions],
  )

  function setTrainerAttendance(trainerId: string, status: AttendanceStatus) {
    markAttendance(trainerId, attendanceDate, status)
    toast.success('Attendance updated.')
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title="Daily Attendance"
        subtitle="Mark trainer presence by day."
        action={
          <Input
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
          />
        }
      >
        <div className="space-y-2">
          {trainers.map((trainer) => {
            const row = attendance.find(
              (item) => item.trainerId === trainer.id && item.date === attendanceDate,
            )
            return (
              <div
                key={trainer.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-white">{trainer.name}</p>
                  <p className="text-xs text-slate-400">{trainer.specialization}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="soft"
                    size="sm"
                    className={row?.status === 'present' ? 'bg-emerald-500/20 text-emerald-200' : ''}
                    onClick={() => setTrainerAttendance(trainer.id, 'present')}
                  >
                    Present
                  </Button>
                  <Button
                    variant="soft"
                    size="sm"
                    className={row?.status === 'absent' ? 'bg-rose-500/20 text-rose-200' : ''}
                    onClick={() => setTrainerAttendance(trainer.id, 'absent')}
                  >
                    Absent
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Assign Sessions" subtitle="Track sessions per trainer.">
        <div className="grid gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Trainer</label>
            <select
              value={selectedTrainerId}
              onChange={(event) => setSelectedTrainerId(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
              ))}
            </select>
          </div>
          <Input type="date" label="Date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          <Input label="Session title" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} />
          <Input type="number" label="Number of sessions" value={String(sessionCount)} onChange={(e) => setSessionCount(Number(e.target.value))} />
          <Button
            onClick={() => {
              if (!selectedTrainerId || !sessionTitle.trim()) {
                toast.error('Trainer and session title are required.')
                return
              }
              addSession(selectedTrainerId, sessionDate, sessionTitle, sessionCount)
              toast.success('Session assigned.')
              setSessionTitle('')
              setSessionCount(1)
            }}
          >
            Assign session
          </Button>
        </div>
        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Session totals</p>
          {trainers.map((trainer) => (
            <div key={trainer.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{trainer.name}</span>
              <span className="font-semibold text-white">{sessionCounts[trainer.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
