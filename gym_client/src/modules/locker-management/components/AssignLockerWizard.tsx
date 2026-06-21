import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { StepProgressBar } from './StepProgressBar'
import { LockerGridTile } from './LockerGridTile'
import { LabeledDate } from './FormFields'
import { IconArrowLeft, IconArrowRight, IconCalendar, IconCheck, IconUser } from './Icons'
import { useCreateAssignment } from '../hooks/useLockerManagement'
import { formatDate } from '../utils/format'
import { usersService } from '../../../services/users.service'
import type { Locker } from '../types'

type Step = 0 | 1 | 2

const FULL_STEP_LABELS = ['Select locker', 'Select member', 'Set duration']
const QUICK_STEP_LABELS = ['Select member', 'Set duration']

export function AssignLockerWizard({
  open,
  onClose,
  availableLockers,
  preselectedLocker = null,
  preselectedMember = null,
  onAssigned,
}: {
  open: boolean
  onClose: () => void
  availableLockers: Locker[]
  /** When set, skip locker picker (assign from locker detail panel). */
  preselectedLocker?: Locker | null
  /** When set, member step is pre-filled and linked to Users.Id. */
  preselectedMember?: { userId: number; name: string } | null
  onAssigned?: () => void
}) {
  const createMut = useCreateAssignment()
  const quickMode = preselectedLocker != null
  const stepLabels = quickMode ? QUICK_STEP_LABELS : FULL_STEP_LABELS
  const today = new Date().toISOString().slice(0, 10)
  const defaultExpiry = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const [step, setStep] = useState<Step>(0)
  const [lockerId, setLockerId] = useState<string>('')
  const [memberUserId, setMemberUserId] = useState<number>(0)
  const [memberName, setMemberName] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('')
  const [assignedDate, setAssignedDate] = useState(today)
  const [expiryDate, setExpiryDate] = useState(defaultExpiry)
  const [search, setSearch] = useState('')

  const stepRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setStep(0)
      setLockerId('')
      setMemberUserId(0)
      setMemberName('')
      setMemberSearch('')
      setDebouncedMemberSearch('')
      setAssignedDate(today)
      setExpiryDate(defaultExpiry)
      setSearch('')
      return
    }
    if (preselectedLocker) {
      setLockerId(preselectedLocker.id)
      setStep(0)
      setAssignedDate(today)
      setExpiryDate(defaultExpiry)
    }
    if (preselectedMember) {
      setMemberUserId(preselectedMember.userId)
      setMemberName(preselectedMember.name)
    }
    // intentionally only run when `open` / preselected locker flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedLocker?.id, preselectedMember?.userId])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedMemberSearch(memberSearch.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [memberSearch])

  const { data: memberSearchPage, isFetching: membersFetching } = useQuery({
    queryKey: ['locker-assign-member-search', debouncedMemberSearch],
    queryFn: () =>
      usersService
        .getPaged({
          page: 1,
          pageSize: 20,
          search: debouncedMemberSearch || undefined,
          membersOnly: true,
          includeBilling: false,
        })
        .then((r) => r.data),
    enabled: open && !preselectedMember,
  })

  const memberOptions = memberSearchPage?.items ?? []

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

  const selected =
    preselectedLocker ??
    availableLockers.find((l) => l.id === lockerId) ??
    null

  const filteredLockers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableLockers
    return availableLockers.filter(
      (l) =>
        l.lockerNumber.toLowerCase().includes(q) ||
        (l.location ?? '').toLowerCase().includes(q),
    )
  }, [availableLockers, search])

  const validLocker = !!selected
  const validMember = memberUserId > 0 && memberName.trim() !== ''
  const validDuration =
    assignedDate !== '' && expiryDate !== '' && new Date(expiryDate) > new Date(assignedDate)

  const canSubmit = validLocker && validMember && validDuration

  const lastStep = quickMode ? 1 : 2

  const next = () => setStep((s) => Math.min(lastStep, (s + 1) as Step) as Step)
  const back = () => setStep((s) => Math.max(0, (s - 1) as Step) as Step)

  const stepValid = quickMode
    ? step === 0
      ? validMember
      : validDuration
    : step === 0
      ? validLocker
      : step === 1
        ? validMember
        : validDuration

  const handleSubmit = () => {
    if (!canSubmit || !selected) return
    createMut.mutate(
      {
        input: {
          lockerId: selected.id,
          memberName: memberName.trim(),
          userId: memberUserId,
          assignedDate: new Date(assignedDate).toISOString(),
          expiryDate: new Date(expiryDate).toISOString(),
        },
        lockerNumber: selected.lockerNumber,
      },
      {
        onSuccess: () => {
          onAssigned?.()
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        preselectedLocker
          ? `Assign ${preselectedLocker.lockerNumber} to member`
          : 'Assign locker to member'
      }
      size="wide"
      scrollable
    >
      <div className="flex h-full flex-col gap-5">
        <StepProgressBar steps={stepLabels} current={step} />

        <div ref={stepRef} key={step} className="min-h-[280px]">
          {!quickMode && step === 0 && (
            <StepLockerPicker
              lockers={filteredLockers}
              selectedId={lockerId}
              onSelect={setLockerId}
              search={search}
              onSearchChange={setSearch}
              noResults={availableLockers.length === 0}
            />
          )}
          {(quickMode ? step === 0 : step === 1) && (
            <StepMember
              memberUserId={memberUserId}
              memberName={memberName}
              memberSearch={memberSearch}
              onMemberSearchChange={setMemberSearch}
              members={memberOptions}
              membersLoading={membersFetching}
              lockedMember={preselectedMember}
              onSelectMember={(userId, name) => {
                setMemberUserId(userId)
                setMemberName(name)
              }}
              locker={selected}
            />
          )}
          {(quickMode ? step === 1 : step === 2) && (
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
            Step {step + 1} of {stepLabels.length}
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
            {step < lastStep ? (
              <Button size="sm" onClick={next} disabled={!stepValid}>
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
  memberUserId,
  memberName,
  memberSearch,
  onMemberSearchChange,
  members,
  membersLoading,
  lockedMember,
  onSelectMember,
  locker,
}: {
  memberUserId: number
  memberName: string
  memberSearch: string
  onMemberSearchChange: (v: string) => void
  members: Array<{ id: number; firstName: string; lastName: string; email?: string | null }>
  membersLoading: boolean
  lockedMember?: { userId: number; name: string } | null
  onSelectMember: (userId: number, name: string) => void
  locker: Locker | null
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Which member gets this locker?</p>
        <p className="text-xs text-slate-400">
          Search the member directory so the assignment appears on their profile.
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

      {lockedMember ? (
        <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          {lockedMember.name}
        </div>
      ) : (
        <>
          <Input
            label="Search member"
            value={memberSearch}
            onChange={(e) => onMemberSearchChange(e.target.value)}
            placeholder="Name, email, or phone"
          />
          {membersLoading ? (
            <p className="text-xs text-slate-500">Searching members…</p>
          ) : members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-slate-500">
              No members found.
            </p>
          ) : (
            <div
              className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2"
              data-lenis-prevent
            >
              {members.map((member) => {
                const name = `${member.firstName} ${member.lastName}`.trim()
                const selected = memberUserId === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectMember(member.id, name)}
                    className={[
                      'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                      selected
                        ? 'bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/30'
                        : 'text-slate-200 hover:bg-white/10',
                    ].join(' ')}
                  >
                    <span className="font-semibold">{name}</span>
                    {member.email ? (
                      <span className="mt-0.5 block truncate text-xs text-slate-400">{member.email}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

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
          {memberName.trim() ? memberName : 'Select a member from the list above'}
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
