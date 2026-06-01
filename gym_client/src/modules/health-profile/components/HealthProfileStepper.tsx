import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { healthProfileService } from '../services/healthProfile.service'
import { HealthRiskBadge } from './HealthRiskBadge'
import {
  ALCOHOL_OPTIONS,
  BODY_PARTS,
  computePreviewRisk,
  emptyHealthProfile,
  HEALTH_STEPS,
  healthProfileToForm,
  INJURY_STATUSES,
  INJURY_TYPES,
  MEDICAL_CONDITION_OPTIONS,
  SMOKING_OPTIONS,
  STRESS_OPTIONS,
  type HealthProfile,
  type UpsertHealthProfilePayload,
} from '../types/healthProfile'

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
        active
          ? 'border-[#F5C400]/60 gradient-tiger-soft text-[#F5C400] tiger-glow-soft'
          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.08]'
      }`}
    >
      {children}
    </button>
  )
}

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card-strong border-gradient-tiger rounded-3xl p-6 sm:p-8">
      <h2 className="font-display text-2xl uppercase tracking-wide text-white">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  )
}

function ParqToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value?: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-200">{label}</p>
      <div className="flex gap-2">
        {(['No', 'Yes'] as const).map((opt) => {
          const yes = opt === 'Yes'
          const active = value === yes
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(yes)}
              className={`min-w-[4.5rem] rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                active
                  ? yes
                    ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/40'
                    : 'gradient-tiger-soft text-[#F5C400] ring-1 ring-[#F5C400]/30'
                  : 'bg-white/5 text-slate-500 hover:bg-white/10'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  userId: number
  initial?: HealthProfile | null
  mode?: 'staff' | 'member'
  onSaved?: (profile: HealthProfile) => void
}

const LAST_STEP = HEALTH_STEPS.length - 1

export function HealthProfileStepper({ userId, initial, mode = 'staff', onSaved }: Props) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const base = initial ?? emptyHealthProfile(userId)

  const [form, setForm] = useState<UpsertHealthProfilePayload>(() => healthProfileToForm(base))

  const selectedCodes = useMemo(
    () => new Set(form.medicalConditions.map((c) => c.conditionCode)),
    [form.medicalConditions],
  )

  const previewRisk = useMemo(() => computePreviewRisk(form), [form])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: UpsertHealthProfilePayload = {
        ...form,
        markCompleted: true,
        medications: form.medications.filter((m) => m.medicationName.trim()),
        injuries: form.injuries.filter((i) => i.bodyPart.trim()),
        emergencyContacts: form.emergencyContacts.filter((c) => c.name.trim()),
      }
      const { data } =
        mode === 'member'
          ? await healthProfileService.upsertMine(payload)
          : await healthProfileService.upsertForUser(userId, payload)
      return data
    },
    onSuccess: (data) => {
      toast.success('Health profile saved')
      queryClient.setQueryData(['health-profile', userId], data)
      void queryClient.invalidateQueries({ queryKey: ['health-profile-summary', userId] })
      setForm(healthProfileToForm(data))
      setSaveSuccess(true)
      setStep(LAST_STEP)
      onSaved?.(data)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const toggleCondition = (code: string) => {
    setForm((prev) => {
      const exists = prev.medicalConditions.some((c) => c.conditionCode === code)
      if (exists) {
        return {
          ...prev,
          medicalConditions: prev.medicalConditions.filter((c) => c.conditionCode !== code),
        }
      }
      return {
        ...prev,
        medicalConditions: [...prev.medicalConditions, { conditionCode: code, customConditionName: null, notes: null }],
      }
    })
  }

  const otherCondition = form.medicalConditions.find((c) => c.conditionCode === 'Other')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (step === LAST_STEP && !saveMutation.isPending) {
      setSaveSuccess(false)
      saveMutation.mutate()
    }
  }

  return (
    <form className="mx-auto max-w-3xl" onSubmit={handleSubmit} noValidate>
      {saveSuccess && (
        <div
          className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          Health profile saved. You can keep editing{mode === 'staff' ? ' or go back to the member profile when finished' : ''}.
        </div>
      )}
      {/* Stepper header */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2">
          {HEALTH_STEPS.map((label, i) => {
            const active = i === step
            const done = i < step
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition ${
                  active
                    ? 'border-[#F5C400]/50 bg-[#F5C400]/10 text-[#F5C400]'
                    : done
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                      : 'border-white/10 bg-white/[0.03] text-slate-500'
                }`}
              >
                <span className="font-display text-sm">{String(i + 1).padStart(2, '0')}</span>
                <span className="hidden text-xs font-medium sm:inline">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {step === 0 && (
        <StepCard
          title="Health Overview"
          subtitle="A quick snapshot helps coaches personalize your training safely."
        >
          <textarea
            value={form.healthOverview ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, healthOverview: e.target.value }))}
            rows={5}
            placeholder="Goals, past surgeries, anything your coach should know upfront…"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#F5C400]/40 focus:outline-none focus:ring-2 focus:ring-[#F5C400]/15"
          />
        </StepCard>
      )}

      {step === 1 && (
        <StepCard title="Medical Conditions" subtitle="Tap all that apply — no long checkbox lists.">
          <div className="flex flex-wrap gap-2">
            {MEDICAL_CONDITION_OPTIONS.map(({ code, label }) => (
              <Chip key={code} active={selectedCodes.has(code)} onClick={() => toggleCondition(code)}>
                {label}
              </Chip>
            ))}
          </div>
          {selectedCodes.has('Other') && (
            <Input
              label="Describe other condition"
              value={otherCondition?.customConditionName ?? ''}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  medicalConditions: p.medicalConditions.map((c) =>
                    c.conditionCode === 'Other' ? { ...c, customConditionName: e.target.value } : c,
                  ),
                }))
              }
            />
          )}
        </StepCard>
      )}

      {step === 2 && (
        <StepCard title="Current Medications" subtitle="Add each medication you take regularly.">
          {form.medications.map((med, idx) => (
            <div key={idx} className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
              <Input
                label="Medication name"
                value={med.medicationName}
                onChange={(e) =>
                  setForm((p) => {
                    const medications = [...p.medications]
                    medications[idx] = { ...medications[idx], medicationName: e.target.value }
                    return { ...p, medications }
                  })
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Dosage"
                  value={med.dosage ?? ''}
                  onChange={(e) =>
                    setForm((p) => {
                      const medications = [...p.medications]
                      medications[idx] = { ...medications[idx], dosage: e.target.value }
                      return { ...p, medications }
                    })
                  }
                />
                <Input
                  label="Reason"
                  value={med.reason ?? ''}
                  onChange={(e) =>
                    setForm((p) => {
                      const medications = [...p.medications]
                      medications[idx] = { ...medications[idx], reason: e.target.value }
                      return { ...p, medications }
                    })
                  }
                />
              </div>
              <button
                type="button"
                className="text-xs text-rose-400 hover:text-rose-300"
                onClick={() =>
                  setForm((p) => ({ ...p, medications: p.medications.filter((_, i) => i !== idx) }))
                }
              >
                Remove
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setForm((p) => ({
                ...p,
                medications: [...p.medications, { medicationName: '', dosage: '', reason: '' }],
              }))
            }
          >
            + Add medication
          </Button>
        </StepCard>
      )}

      {step === 3 && (
        <StepCard title="Injuries & Limitations" subtitle="Track past and current injuries for smarter programming.">
          {form.injuries.map((injury, idx) => (
            <div key={idx} className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-400">Body part</span>
                  <select
                    value={injury.bodyPart}
                    onChange={(e) =>
                      setForm((p) => {
                        const injuries = [...p.injuries]
                        injuries[idx] = { ...injuries[idx], bodyPart: e.target.value }
                        return { ...p, injuries }
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100"
                  >
                    <option value="">Select…</option>
                    {BODY_PARTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-400">Injury type</span>
                  <select
                    value={injury.injuryType}
                    onChange={(e) =>
                      setForm((p) => {
                        const injuries = [...p.injuries]
                        injuries[idx] = { ...injuries[idx], injuryType: e.target.value }
                        return { ...p, injuries }
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100"
                  >
                    <option value="">Select…</option>
                    {INJURY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {INJURY_STATUSES.map((status) => (
                  <Chip
                    key={status}
                    active={injury.status === status}
                    onClick={() =>
                      setForm((p) => {
                        const injuries = [...p.injuries]
                        injuries[idx] = { ...injuries[idx], status }
                        return { ...p, injuries }
                      })
                    }
                  >
                    {status}
                  </Chip>
                ))}
              </div>
              <textarea
                value={injury.notes ?? ''}
                onChange={(e) =>
                  setForm((p) => {
                    const injuries = [...p.injuries]
                    injuries[idx] = { ...injuries[idx], notes: e.target.value }
                    return { ...p, injuries }
                  })
                }
                rows={2}
                placeholder="Notes (optional)"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
              />
              <button
                type="button"
                className="text-xs text-rose-400"
                onClick={() => setForm((p) => ({ ...p, injuries: p.injuries.filter((_, i) => i !== idx) }))}
              >
                Remove injury
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setForm((p) => ({
                ...p,
                injuries: [...p.injuries, { bodyPart: '', injuryType: '', status: 'Active', notes: '' }],
              }))
            }
          >
            + Add injury
          </Button>
        </StepCard>
      )}

      {step === 4 && (
        <StepCard
          title="Exercise Readiness (PAR-Q)"
          subtitle="Standard pre-participation screening — answer honestly for your safety."
        >
          <ParqToggle
            label="Chest pain during exercise?"
            value={form.parqChestPainDuringExercise}
            onChange={(v) => setForm((p) => ({ ...p, parqChestPainDuringExercise: v }))}
          />
          <ParqToggle
            label="Doctor advised against exercise?"
            value={form.parqDoctorAdvisedAgainstExercise}
            onChange={(v) => setForm((p) => ({ ...p, parqDoctorAdvisedAgainstExercise: v }))}
          />
          <ParqToggle
            label="Shortness of breath?"
            value={form.parqShortnessOfBreath}
            onChange={(v) => setForm((p) => ({ ...p, parqShortnessOfBreath: v }))}
          />
          <ParqToggle
            label="Dizziness or fainting?"
            value={form.parqDizzinessOrFainting}
            onChange={(v) => setForm((p) => ({ ...p, parqDizzinessOrFainting: v }))}
          />
          <ParqToggle
            label="Recent surgery (last 6 months)?"
            value={form.parqRecentSurgery}
            onChange={(v) => setForm((p) => ({ ...p, parqRecentSurgery: v }))}
          />
        </StepCard>
      )}

      {step === 5 && (
        <StepCard title="Lifestyle Assessment" subtitle="Recovery habits shape how hard you can train.">
          <div>
            <p className="mb-2 text-sm text-slate-400">Smoking</p>
            <div className="flex flex-wrap gap-2">
              {SMOKING_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  active={form.smokingStatus === opt}
                  onClick={() => setForm((p) => ({ ...p, smokingStatus: opt }))}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-slate-400">Alcohol</p>
            <div className="flex flex-wrap gap-2">
              {ALCOHOL_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  active={form.alcoholFrequency === opt}
                  onClick={() => setForm((p) => ({ ...p, alcoholFrequency: opt }))}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-slate-400">Stress level</p>
            <div className="flex flex-wrap gap-2">
              {STRESS_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  active={form.stressLevel === opt}
                  onClick={() => setForm((p) => ({ ...p, stressLevel: opt }))}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-400">Average sleep (hours)</span>
            <input
              type="number"
              min={0}
              max={16}
              step={0.5}
              value={form.sleepHours ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, sleepHours: e.target.value ? Number(e.target.value) : null }))
              }
              className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-100"
            />
          </label>
        </StepCard>
      )}

      {step === 6 && (
        <StepCard title="Emergency Contact" subtitle="Who should we call in an emergency at the gym?">
          {form.emergencyContacts.map((contact, idx) => (
            <div key={idx} className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Name"
                value={contact.name}
                onChange={(e) =>
                  setForm((p) => {
                    const emergencyContacts = [...p.emergencyContacts]
                    emergencyContacts[idx] = { ...emergencyContacts[idx], name: e.target.value }
                    return { ...p, emergencyContacts }
                  })
                }
              />
              <Input
                label="Relationship"
                value={contact.relationship ?? ''}
                onChange={(e) =>
                  setForm((p) => {
                    const emergencyContacts = [...p.emergencyContacts]
                    emergencyContacts[idx] = { ...emergencyContacts[idx], relationship: e.target.value }
                    return { ...p, emergencyContacts }
                  })
                }
              />
              <Input
                label="Mobile"
                className="sm:col-span-2"
                value={contact.mobile}
                onChange={(e) =>
                  setForm((p) => {
                    const emergencyContacts = [...p.emergencyContacts]
                    emergencyContacts[idx] = { ...emergencyContacts[idx], mobile: e.target.value }
                    return { ...p, emergencyContacts }
                  })
                }
              />
            </div>
          ))}
        </StepCard>
      )}

      {step === 7 && (
        <StepCard title="Doctor Information" subtitle="Optional — for members under medical supervision.">
          <Input
            label="Doctor name"
            value={form.doctorName ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, doctorName: e.target.value }))}
          />
          <Input
            label="Clinic / hospital"
            value={form.doctorClinic ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, doctorClinic: e.target.value }))}
          />
          <Input
            label="Contact number"
            value={form.doctorContactNumber ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, doctorContactNumber: e.target.value }))}
          />
        </StepCard>
      )}

      {step === 8 && (
        <StepCard title="Risk Assessment" subtitle="Review your profile before submitting.">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-5">
            <HealthRiskBadge level={previewRisk} />
            <p className="text-sm text-slate-400">
              Final risk level is calculated server-side and shared with your coach.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Conditions</p>
              <p className="mt-1">{form.medicalConditions.length || 'None reported'}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Active injuries</p>
              <p className="mt-1">
                {form.injuries.filter((i) => i.status !== 'Resolved').length || 'None'}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Medications</p>
              <p className="mt-1">{form.medications.filter((m) => m.medicationName.trim()).length}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">PAR-Q flags</p>
              <p className="mt-1">
                {
                  [
                    form.parqChestPainDuringExercise,
                    form.parqDoctorAdvisedAgainstExercise,
                    form.parqShortnessOfBreath,
                    form.parqDizzinessOrFainting,
                    form.parqRecentSurgery,
                  ].filter(Boolean).length
                }
              </p>
            </div>
          </div>
        </StepCard>
      )}

      {/* Navigation */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        <div className="flex gap-2">
          {step < LAST_STEP ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save Health Profile'}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
