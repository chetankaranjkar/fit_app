import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { StepProgressBar } from './StepProgressBar'
import { LockerGridTile } from './LockerGridTile'
import { LabeledDate, LabeledInput } from './FormFields'
import { IconArrowLeft, IconArrowRight, IconCalendar, IconCheck, IconUser } from './Icons'
import { useCreateAssignment } from '../hooks/useLockerManagement'
import { formatDate } from '../utils/format'
import type { Locker } from '../types'

type Step = 0 | 1 | 2

const STEP_LABELS = ['Select locker', 'Select member', 'Set duration']

export function AssignLockerWizard({
  open,
  onClose,
  availableLockers,
}: {
  open: boolean
  onClose: () => void
  availableLockers: Locker[]
}) {
  const createMut = useCreateAssignment()
  const today = new Date().toISOString().slice(0, 10)
  const defaultExpiry = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const [step, setStep] = useState<Step>(0)
  const [lockerId, setLockerId] = useState<string>('')
  const [memberName, setMemberName] = useState('')
  const [assignedDate, setAssignedDate] = useState(today)
  const [expiryDate, setExpiryDate] = useState(defaultExpiry)
  const [search, setSearch] = useState('')

  const stepRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      // reset on close
      setStep(0)
      setLockerId('')
      setMemberName('')
      setAssignedDate(today)
      setExpiryDate(defaultExpiry)
      setSearch('')
    }
    // intentionally only run when `open` flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Cross-fade step content with a subtle horizontal slide
  useEffect(() => {
    const el = stepRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, x: 12 },
        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' },
      )
    }, el)
    return () => ctx.revert()
  }, [step])

  const selected = availableLockers.find((l) => l.id === lockerId) ?? null

  const filteredLockers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableLockers
    return availableLockers.filter(
      (l) =>
        l.lockerNumber.toLowerCase().includes(q) ||
        (l.location ?? '').toLowerCase().includes(q),
    )
  }, [availableLockers, search])

  const validStep0 = !!selected
  const validStep1 = memberName.trim() !== ''
  const validStep2 =
    assignedDate !== '' && expiryDate !== '' && new Date(expiryDate) > new Date(assignedDate)
  const canSubmit = validStep0 && validStep1 && validStep2

  const next = () => setStep((s) => Math.min(2, (s + 1) as Step) as Step)
  const back = () => setStep((s) => Math.max(0, (s - 1) as Step) as Step)

  const handleSubmit = () => {
    if (!canSubmit || !selected) return
    createMut.mutate(
      {
        input: {
          lockerId: selected.id,
          memberName: memberName.trim(),
          assignedDate: new Date(assignedDate).toISOString(),
          expiryDate: new Date(expiryDate).toISOString(),
        },
        lockerNumber: selected.lockerNumber,
      },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign locker to member" size="wide" scrollable>
      <div className="flex h-full flex-col gap-5">
        <StepProgressBar steps={STEP_LABELS} current={step} />

        <div ref={stepRef} key={step} className="min-h-[280px]">
          {step === 0 && (
            <StepLockerPicker
              lockers={filteredLockers}
              selectedId={lockerId}
              onSelect={setLockerId}
              search={search}
              onSearchChange={setSearch}
              noResults={availableLockers.length === 0}
            />
          )}
          {step === 1 && (
            <StepMember memberName={memberName} setMemberName={setMemberName} locker={selected} />
          )}
          {step === 2 && (
            <StepDuration
              locker={selected}
              memberName={memberName}
              assignedDate={assignedDate}
              setAssignedDate={setAssignedDate}
              expiryDate={expiryDate}
              setExpiryDate={setExpiryDate}
              submitting={createMut.isPending}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-4">
          <div className="text-[11px] text-slate-500">
            Step {step + 1} of {STEP_LABELS.length}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={back} disabled={createMut.isPending}>
                <IconArrowLeft className="size-3.5" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}
            {step < 2 ? (
              <Button
                size="sm"
                onClick={next}
                disabled={(step === 0 && !validStep0) || (step === 1 && !validStep1)}
              >
                Next
                <IconArrowRight className="size-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={!canSubmit || createMut.isPending}>
                {createMut.isPending ? (
                  'Assigning\u2026'
                ) : (
                  <>
                    <IconCheck className="size-3.5" />
                    Confirm assignment
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — locker picker
// ---------------------------------------------------------------------------

function StepLockerPicker({
  lockers,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  noResults,
}: {
  lockers: Locker[]
  selectedId: string
  onSelect: (id: string) => void
  search: string
  onSearchChange: (v: string) => void
  noResults: boolean
}) {
  if (noResults) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-5 text-center">
        <p className="text-sm font-semibold text-amber-200">No lockers available</p>
        <p className="mt-1 text-xs text-amber-200/80">
          Free up a locker on the Lockers page before assigning.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Pick a locker</p>
          <p className="text-xs text-slate-400">
            Only lockers currently marked as Available are shown.
          </p>
        </div>
        <div className="relative w-48">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search\u2026"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-blue-400/40 focus:bg-white/[0.07]"
          />
        </div>
      </div>
      {lockers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-500">
          No lockers match your search.
        </p>
      ) : (
        <div
          className="grid max-h-[340px] grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 overflow-y-auto pr-1"
          data-lenis-prevent
        >
          {lockers.map((l) => (
            <LockerGridTile
              key={l.id}
              locker={l}
              selected={l.id === selectedId}
              onClick={(locker) => onSelect(locker.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — member
// ---------------------------------------------------------------------------

function StepMember({
  memberName,
  setMemberName,
  locker,
}: {
  memberName: string
  setMemberName: (v: string) => void
  locker: Locker | null
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Who is this locker for?</p>
        <p className="text-xs text-slate-400">
          Enter the member\u2019s full name as it should appear on the assignment.
        </p>
      </div>

      {locker && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
          Assigning locker{' '}
          <span className="font-semibold text-white">{locker.lockerNumber}</span>
          {locker.location ? (
            <>
              {' \u00b7 '}
              <span>{locker.location}</span>
            </>
          ) : null}
        </div>
      )}

      <LabeledInput
        label="Member name"
        value={memberName}
        onChange={setMemberName}
        required
        placeholder="e.g. Rahul Sharma"
      />

      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-sm font-semibold text-white">
          {memberName.trim()
            ? memberName
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()
            : <IconUser className="size-4 text-slate-300" />}
        </span>
        <span className="truncate text-xs text-slate-400">
          {memberName.trim() ? memberName : 'Preview will appear here as you type\u2026'}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — duration
// ---------------------------------------------------------------------------

function StepDuration({
  locker,
  memberName,
  assignedDate,
  setAssignedDate,
  expiryDate,
  setExpiryDate,
  submitting,
}: {
  locker: Locker | null
  memberName: string
  assignedDate: string
  setAssignedDate: (v: string) => void
  expiryDate: string
  setExpiryDate: (v: string) => void
  submitting: boolean
}) {
  const days =
    assignedDate && expiryDate
      ? Math.max(
          0,
          Math.round(
            (new Date(expiryDate).getTime() - new Date(assignedDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0

  const presets = [
    { label: '1 month', months: 1 },
    { label: '3 months', months: 3 },
    { label: '6 months', months: 6 },
    { label: '1 year', months: 12 },
  ]

  const applyPreset = (months: number) => {
    const start = new Date(assignedDate)
    const end = new Date(start)
    end.setMonth(end.getMonth() + months)
    setExpiryDate(end.toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">How long is this assignment?</p>
        <p className="text-xs text-slate-400">
          Pick a quick preset or fine-tune with the date inputs.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.months)}
            disabled={submitting}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:-translate-y-0.5 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200 active:scale-95 disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LabeledDate label="Assigned date" value={assignedDate} onChange={setAssignedDate} required />
        <LabeledDate
          label="Expiry date"
          value={expiryDate}
          onChange={setExpiryDate}
          required
          min={assignedDate}
        />
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Summary
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <SummaryLine icon={<IconUser className="size-3" />} label="Member" value={memberName || '\u2014'} />
          <SummaryLine
            icon={<IconCalendar className="size-3" />}
            label="Locker"
            value={locker ? locker.lockerNumber : '\u2014'}
          />
          <SummaryLine
            icon={<IconCalendar className="size-3" />}
            label="From"
            value={formatDate(assignedDate)}
          />
          <SummaryLine
            icon={<IconCalendar className="size-3" />}
            label="Until"
            value={formatDate(expiryDate)}
          />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2">
          <span className="text-xs font-semibold text-blue-100">Duration</span>
          <span className="text-sm font-bold text-white">
            {days} day{days === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  )
}

function SummaryLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-white">{value}</p>
    </div>
  )
}
