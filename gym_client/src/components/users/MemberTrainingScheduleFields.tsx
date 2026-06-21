import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BATCH_TIME_WINDOWS,
  DEFAULT_TRAINING_SCHEDULE,
  TRAINING_DAY_OPTIONS,
  type MemberTrainingScheduleValue,
  type TrainingScheduleConflict,
  buildTrainingSchedulePayload,
  isTrainingScheduleValid,
} from '../../lib/memberTrainingSchedule'
import { MEMBER_BATCH_VALUES } from '../../lib/memberBatches'
import { usersService } from '../../services/users.service'

type Props = {
  value: MemberTrainingScheduleValue
  onChange: (next: MemberTrainingScheduleValue) => void
  trainerId?: number | null
  userId?: number | null
  showAdminOverride?: boolean
  disabled?: boolean
}

export function MemberTrainingScheduleFields({
  value,
  onChange,
  trainerId,
  userId,
  showAdminOverride = false,
  disabled = false,
}: Props) {
  const [debouncedKey, setDebouncedKey] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKey(
        [
          trainerId ?? '',
          userId ?? '',
          value.trainingScheduleType,
          value.preferredGymTime,
          value.trainingStartTime,
          value.trainingEndTime,
          value.trainingDaysOfWeek.join(','),
        ].join('|'),
      )
    }, 350)
    return () => window.clearTimeout(timer)
  }, [trainerId, userId, value])

  const canValidate =
    Boolean(trainerId && trainerId > 0) &&
    isTrainingScheduleValid(value) &&
    !value.overrideTrainingScheduleConflict

  const { data: conflicts = [], isFetching } = useQuery({
    queryKey: ['training-schedule-conflicts', debouncedKey],
    queryFn: async () => {
      const payload = buildTrainingSchedulePayload(value)
      const { data } = await usersService.validateTrainingSchedule({
        trainerId: trainerId!,
        userId: userId ?? undefined,
        trainingScheduleType: payload.trainingScheduleType,
        preferredGymTime: payload.preferredGymTime ?? undefined,
        trainingStartTime: payload.trainingStartTime,
        trainingEndTime: payload.trainingEndTime,
        trainingDaysOfWeek: payload.trainingDaysOfWeek ?? undefined,
      })
      return (Array.isArray(data) ? data : []) as TrainingScheduleConflict[]
    },
    enabled: canValidate && debouncedKey !== '',
    staleTime: 15_000,
  })

  const batchHint = useMemo(() => {
    if (!value.preferredGymTime) return null
    const key = value.preferredGymTime as (typeof MEMBER_BATCH_VALUES)[number]
    return BATCH_TIME_WINDOWS[key] ?? null
  }, [value.preferredGymTime])

  const toggleDay = (day: number) => {
    const set = new Set(value.trainingDaysOfWeek)
    if (set.has(day)) set.delete(day)
    else set.add(day)
    onChange({
      ...value,
      trainingDaysOfWeek: [...set].sort((a, b) => a - b),
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Training schedule</label>
        <div className="flex flex-wrap gap-2">
          {(['Batch', 'Custom'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  trainingScheduleType: mode,
                  ...(mode === 'Custom'
                    ? {
                        trainingStartTime:
                          value.trainingStartTime || DEFAULT_TRAINING_SCHEDULE.trainingStartTime,
                        trainingEndTime:
                          value.trainingEndTime || DEFAULT_TRAINING_SCHEDULE.trainingEndTime,
                        trainingDaysOfWeek:
                          value.trainingDaysOfWeek.length > 0
                            ? value.trainingDaysOfWeek
                            : DEFAULT_TRAINING_SCHEDULE.trainingDaysOfWeek,
                      }
                    : {}),
                })
              }
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                value.trainingScheduleType === mode
                  ? 'border-blue-400/40 bg-blue-500/15 text-blue-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                disabled ? 'opacity-50' : '',
              ].join(' ')}
            >
              {mode === 'Batch' ? 'Fixed shift' : 'Custom time slot'}
            </button>
          ))}
        </div>
      </div>

      {value.trainingScheduleType === 'Batch' ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Preferred gym shift</label>
          <select
            aria-label="Preferred gym shift"
            disabled={disabled}
            value={value.preferredGymTime}
            onChange={(e) => onChange({ ...value, preferredGymTime: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          >
            <option value="" className="bg-slate-900">
              Select shift
            </option>
            {MEMBER_BATCH_VALUES.map((shift) => (
              <option key={shift} value={shift} className="bg-slate-900">
                {shift}
              </option>
            ))}
          </select>
          {batchHint ? <p className="mt-1 text-[11px] text-slate-500">Typical window: {batchHint}</p> : null}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Start time</label>
              <input
                type="time"
                disabled={disabled}
                value={value.trainingStartTime}
                onChange={(e) => onChange({ ...value, trainingStartTime: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">End time</label>
              <input
                type="time"
                disabled={disabled}
                value={value.trainingEndTime}
                onChange={(e) => onChange({ ...value, trainingEndTime: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Training days</p>
            <div className="flex flex-wrap gap-2">
              {TRAINING_DAY_OPTIONS.map(({ value: day, label }) => {
                const selected = value.trainingDaysOfWeek.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleDay(day)}
                    className={[
                      'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition',
                      selected
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {canValidate && conflicts.length > 0 ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-100">
          <p className="font-semibold">Schedule conflict with this coach</p>
          <ul className="mt-2 space-y-1.5">
            {conflicts.map((conflict) => (
              <li key={conflict.userId}>
                <span className="font-medium">{conflict.memberName}</span>
                {' · '}
                {conflict.scheduleLabel}
                {' · '}
                {conflict.overlapDays} {conflict.overlapTime}
              </li>
            ))}
          </ul>
          {showAdminOverride ? (
            <label className="mt-3 flex items-start gap-2 text-amber-50">
              <input
                type="checkbox"
                checked={value.overrideTrainingScheduleConflict}
                onChange={(e) =>
                  onChange({ ...value, overrideTrainingScheduleConflict: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-amber-300/40"
              />
              <span>Admin override — allow overlapping bookings for this member</span>
            </label>
          ) : (
            <p className="mt-2 text-amber-200/90">
              Choose a different slot or ask an admin to adjust the schedule.
            </p>
          )}
        </div>
      ) : null}

      {canValidate && isFetching ? (
        <p className="text-[11px] text-slate-500">Checking coach availability…</p>
      ) : null}
    </div>
  )
}
