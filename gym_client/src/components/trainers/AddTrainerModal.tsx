import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { trainersService } from '../../services/trainers.service'
import { usersService } from '../../services/users.service'
import type { CreateTrainerDto, TrainerGender } from '../../types/trainer'
import {
  AVAILABILITY_STATUSES,
  COMMON_CERTIFICATIONS,
  COMMON_SPECIALIZATIONS,
  TRAINER_GENDERS,
  WEEK_DAYS,
  joinCsv,
} from '../../types/trainer'

/* ---------- types ---------- */

interface Props {
  open: boolean
  onClose: () => void
}

type WizardStep = 0 | 1 | 2

interface FormState {
  userId: number
  employeeCode: string
  gender: TrainerGender | ''
  specialization: string
  secondarySpecializations: string[]
  experienceYears: number | ''
  certifications: string[]
  languagesSpoken: string
  joiningDate: string
  employmentType: CreateTrainerDto['employmentType'] | ''
  sessionRate: number | ''
  hourlyRate: number | ''
  currency: string
  maxClients: number | ''
  workingDays: string[]
  workingHoursStart: string
  workingHoursEnd: string
  availabilityStatus: string
  bio: string
  profilePicture: string
  instagramUrl: string
  linkedinUrl: string
  websiteUrl: string
  isPersonalTrainer: boolean
}

const EMPTY: FormState = {
  userId: 0,
  employeeCode: '',
  gender: '',
  specialization: '',
  secondarySpecializations: [],
  experienceYears: '',
  certifications: [],
  languagesSpoken: '',
  joiningDate: '',
  employmentType: '',
  sessionRate: '',
  hourlyRate: '',
  currency: '₹',
  maxClients: '',
  workingDays: [],
  workingHoursStart: '',
  workingHoursEnd: '',
  availabilityStatus: 'Available',
  bio: '',
  profilePicture: '',
  instagramUrl: '',
  linkedinUrl: '',
  websiteUrl: '',
  isPersonalTrainer: true,
}

const STEPS = [
  { id: 0, label: 'Identity', icon: '1' },
  { id: 1, label: 'Profession', icon: '2' },
  { id: 2, label: 'Availability', icon: '3' },
] as const

const labelClass =
  'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'
const controlClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

/* ---------- component ---------- */

export function AddTrainerModal({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<WizardStep>(0)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await usersService.getAll()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => (await trainersService.getAll()).data,
  })
  const trainerUserIds = useMemo(
    () => new Set(trainers.map((t) => t.userId)),
    [trainers]
  )
  const usersNotTrainers = useMemo(
    () =>
      (users as { id: number; firstName?: string; lastName?: string; email?: string }[]).filter(
        (u) => !trainerUserIds.has(u.id)
      ),
    [users, trainerUserIds]
  )

  const createMutation = useMutation({
    mutationFn: (dto: CreateTrainerDto) => trainersService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-stats'] })
      reset()
      onClose()
    },
    onError: (err: Error) => setError(err.message || 'Failed to add trainer'),
  })

  const reset = () => {
    setForm(EMPTY)
    setError(null)
    setStep(0)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const toggleChip = (key: 'secondarySpecializations' | 'certifications' | 'workingDays', value: string) =>
    setForm((f) => {
      const arr = f[key]
      return {
        ...f,
        [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value],
      }
    })

  const canNext = (() => {
    if (step === 0) return form.userId > 0
    if (step === 1) return true // profession is optional-ish
    return true
  })()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.userId) {
      setError('Please select a user to link as this trainer.')
      setStep(0)
      return
    }

    const dto: CreateTrainerDto = {
      userId: form.userId,
      employeeCode: form.employeeCode.trim() || undefined,
      gender: form.gender || undefined,
      specialization: form.specialization.trim() || undefined,
      secondarySpecializations: form.secondarySpecializations.length
        ? joinCsv(form.secondarySpecializations)
        : undefined,
      experienceYears: form.experienceYears === '' ? undefined : Number(form.experienceYears),
      certifications: form.certifications.length ? joinCsv(form.certifications) : undefined,
      languagesSpoken: form.languagesSpoken.trim() || undefined,
      joiningDate: form.joiningDate || undefined,
      employmentType: form.employmentType || undefined,
      sessionRate: form.sessionRate === '' ? undefined : Number(form.sessionRate),
      hourlyRate: form.hourlyRate === '' ? undefined : Number(form.hourlyRate),
      currency: form.currency || undefined,
      maxClients: form.maxClients === '' ? undefined : Number(form.maxClients),
      workingDays: form.workingDays.length ? form.workingDays.join(',') : undefined,
      workingHoursStart: form.workingHoursStart || undefined,
      workingHoursEnd: form.workingHoursEnd || undefined,
      availabilityStatus: form.availabilityStatus || undefined,
      bio: form.bio.trim() || undefined,
      profilePicture: form.profilePicture.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      websiteUrl: form.websiteUrl.trim() || undefined,
      isPersonalTrainer: form.isPersonalTrainer,
    }

    createMutation.mutate(dto)
  }

  const selectedUser = usersNotTrainers.find((u) => u.id === form.userId)

  return (
    <Modal open={open} onClose={handleClose} title="Add trainer" size="wide" scrollable>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        {/* stepper */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => {
            const isActive = step === s.id
            const isDone = step > s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id as WizardStep)}
                className="flex flex-1 items-center gap-2"
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 transition ${
                    isActive
                      ? 'bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-white ring-transparent'
                      : isDone
                        ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                        : 'bg-white/5 text-slate-400 ring-white/10'
                  }`}
                >
                  {isDone ? '✓' : s.icon}
                </span>
                <span
                  className={`truncate text-xs font-semibold uppercase tracking-wider ${
                    isActive ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="h-px flex-1 bg-white/10" aria-hidden />
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          >
            {error}
          </p>
        )}

        {/* step 0 — identity */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Link an existing user</label>
              <select
                aria-label="Select user to add as trainer"
                value={form.userId || ''}
                onChange={(e) => update('userId', Number(e.target.value))}
                className={controlClass}
                required
              >
                <option value="" className="bg-slate-900">
                  Select a user (member)
                </option>
                {usersNotTrainers.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900">
                    {(u.firstName ?? '') + ' ' + (u.lastName ?? '')}
                    {u.email ? ` (${u.email})` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {usersNotTrainers.length === 0
                  ? 'No eligible users — add members in Users first; they will appear here.'
                  : 'Only users who are not already trainers are listed.'}
              </p>
            </div>

            {selectedUser && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-semibold text-white">
                    {(selectedUser.firstName?.[0] ?? '') + (selectedUser.lastName?.[0] ?? '')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {(selectedUser.firstName ?? '') + ' ' + (selectedUser.lastName ?? '')}
                    </p>
                    <p className="truncate text-xs text-slate-400">{selectedUser.email}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Employee code"
                value={form.employeeCode}
                onChange={(e) => update('employeeCode', e.target.value)}
                placeholder="e.g. TRN-0042"
              />
              <div>
                <label className={labelClass}>Gender</label>
                <select
                  aria-label="Gender"
                  value={form.gender}
                  onChange={(e) => update('gender', e.target.value as TrainerGender | '')}
                  className={controlClass}
                >
                  <option value="" className="bg-slate-900">
                    Prefer not to say
                  </option>
                  {TRAINER_GENDERS.map((g) => (
                    <option key={g} value={g} className="bg-slate-900">
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Profile picture URL"
              value={form.profilePicture}
              onChange={(e) => update('profilePicture', e.target.value)}
              placeholder="https://…/avatar.jpg"
            />
          </div>
        )}

        {/* step 1 — profession */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Primary specialization</label>
                <select
                  aria-label="Primary specialization"
                  value={form.specialization}
                  onChange={(e) => update('specialization', e.target.value)}
                  className={controlClass}
                >
                  <option value="" className="bg-slate-900">
                    Choose…
                  </option>
                  {COMMON_SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s} className="bg-slate-900">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Experience (years)"
                type="number"
                min={0}
                value={form.experienceYears === '' ? '' : String(form.experienceYears)}
                onChange={(e) =>
                  update('experienceYears', e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="e.g. 5"
              />
            </div>

            <div>
              <label className={labelClass}>Secondary specializations</label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SPECIALIZATIONS.filter((s) => s !== form.specialization).map((s) => {
                  const on = form.secondarySpecializations.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleChip('secondarySpecializations', s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ring-1 ${
                        on
                          ? 'bg-blue-500/20 text-blue-100 ring-blue-400/40'
                          : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      {on ? '✓ ' : ''}
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Certifications</label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_CERTIFICATIONS.map((c) => {
                  const on = form.certifications.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleChip('certifications', c)}
                      className={`rounded-md px-2.5 py-1 text-xs font-mono transition ring-1 ${
                        on
                          ? 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/40'
                          : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      {on ? '✓ ' : ''}
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Languages spoken"
                value={form.languagesSpoken}
                onChange={(e) => update('languagesSpoken', e.target.value)}
                placeholder="English, Hindi, Marathi"
              />
              <div>
                <label className={labelClass}>Employment type</label>
                <select
                  aria-label="Employment type"
                  value={form.employmentType ?? ''}
                  onChange={(e) =>
                    update(
                      'employmentType',
                      e.target.value as CreateTrainerDto['employmentType']
                    )
                  }
                  className={controlClass}
                >
                  <option value="" className="bg-slate-900">
                    Select…
                  </option>
                  {(['Full-Time', 'Part-Time', 'Contract', 'Freelance'] as const).map((t) => (
                    <option key={t} value={t} className="bg-slate-900">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input
                label="Currency"
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                placeholder="₹"
              />
              <Input
                label="Session rate"
                type="number"
                min={0}
                value={form.sessionRate === '' ? '' : String(form.sessionRate)}
                onChange={(e) =>
                  update('sessionRate', e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="800"
              />
              <Input
                label="Hourly rate"
                type="number"
                min={0}
                value={form.hourlyRate === '' ? '' : String(form.hourlyRate)}
                onChange={(e) =>
                  update('hourlyRate', e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="1500"
              />
              <Input
                label="Max clients"
                type="number"
                min={0}
                value={form.maxClients === '' ? '' : String(form.maxClients)}
                onChange={(e) =>
                  update('maxClients', e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="25"
              />
            </div>

            <div>
              <label className={labelClass}>Bio</label>
              <textarea
                aria-label="Bio"
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                rows={3}
                placeholder="Short bio describing specialisation, philosophy, achievements…"
                className={controlClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Instagram"
                value={form.instagramUrl}
                onChange={(e) => update('instagramUrl', e.target.value)}
                placeholder="https://instagram.com/…"
              />
              <Input
                label="LinkedIn"
                value={form.linkedinUrl}
                onChange={(e) => update('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
              <Input
                label="Website"
                value={form.websiteUrl}
                onChange={(e) => update('websiteUrl', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
        )}

        {/* step 2 — availability */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Joining date</label>
                <input
                  type="date"
                  aria-label="Joining date"
                  value={form.joiningDate}
                  onChange={(e) => update('joiningDate', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <label className={labelClass}>Availability</label>
                <select
                  aria-label="Availability status"
                  value={form.availabilityStatus}
                  onChange={(e) => update('availabilityStatus', e.target.value)}
                  className={controlClass}
                >
                  {AVAILABILITY_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-slate-900">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <label className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 sm:mt-0 sm:self-end">
                <input
                  type="checkbox"
                  checked={form.isPersonalTrainer}
                  onChange={(e) => update('isPersonalTrainer', e.target.checked)}
                  className="accent-blue-500"
                />
                Available as personal trainer
              </label>
            </div>

            <div>
              <label className={labelClass}>Working days</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((d) => {
                  const on = form.workingDays.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleChip('workingDays', d)}
                      className={`size-10 rounded-lg text-xs font-semibold transition ring-1 ${
                        on
                          ? 'bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-white ring-transparent'
                          : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Working hours — start</label>
                <input
                  type="time"
                  aria-label="Working hours start"
                  value={form.workingHoursStart}
                  onChange={(e) => update('workingHoursStart', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <label className={labelClass}>Working hours — end</label>
                <input
                  type="time"
                  aria-label="Working hours end"
                  value={form.workingHoursEnd}
                  onChange={(e) => update('workingHoursEnd', e.target.value)}
                  className={controlClass}
                />
              </div>
            </div>

            <SummaryPanel form={form} userLabel={selectedUser ? `${selectedUser.firstName ?? ''} ${selectedUser.lastName ?? ''}`.trim() : undefined} />
          </div>
        )}

        {/* footer */}
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={step === 0 ? handleClose : () => setStep((step - 1) as WizardStep)}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step < 2 ? (
            <Button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((step + 1) as WizardStep)}
            >
              Continue
            </Button>
          ) : (
            <Button type="submit" isLoading={createMutation.isPending}>
              Add trainer
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}

/* ---------- small review panel on last step ---------- */

function SummaryPanel({
  form,
  userLabel,
}: {
  form: FormState
  userLabel?: string
}) {
  const row = (label: string, value: string) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="max-w-[60%] truncate text-right text-xs text-slate-200">{value || '—'}</span>
    </div>
  )

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Review
      </p>
      {row('User', userLabel ?? '—')}
      {row('Specialization', form.specialization || '—')}
      {row(
        'Also teaches',
        form.secondarySpecializations.length ? form.secondarySpecializations.join(', ') : '—'
      )}
      {row('Certifications', form.certifications.length ? form.certifications.join(', ') : '—')}
      {row('Experience', form.experienceYears !== '' ? `${form.experienceYears} yrs` : '—')}
      {row(
        'Rate',
        form.sessionRate !== ''
          ? `${form.currency}${form.sessionRate}/session`
          : form.hourlyRate !== ''
            ? `${form.currency}${form.hourlyRate}/hr`
            : '—'
      )}
      {row('Max clients', form.maxClients !== '' ? String(form.maxClients) : '—')}
      {row('Working days', form.workingDays.length ? form.workingDays.join(', ') : '—')}
      {row(
        'Hours',
        form.workingHoursStart && form.workingHoursEnd
          ? `${form.workingHoursStart} – ${form.workingHoursEnd}`
          : '—'
      )}
      {row('Availability', form.availabilityStatus)}
    </div>
  )
}

