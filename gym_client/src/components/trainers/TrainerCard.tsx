import { useEffect, useRef, useState } from 'react'
import type { Trainer, AvailabilityStatus } from '../../types/trainer'
import { AVAILABILITY_STATUSES, parseCsv, trainerFullName, trainerInitials } from '../../types/trainer'
import { Button } from '../ui/Button'

interface Props {
  trainer: Trainer
  onView: () => void
  onEdit?: () => void
  onAssign?: () => void
  onToggleActive?: () => void
  onAvailability?: (status: AvailabilityStatus) => void
  onDelete?: () => void
}

function availabilityPillClass(raw?: string | null) {
  const s = (raw ?? 'Available').toLowerCase()
  if (s.includes('leave')) return 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
  if (s.includes('busy')) return 'bg-orange-500/15 text-orange-300 ring-orange-500/30'
  if (s.includes('off')) return 'bg-slate-500/15 text-slate-300 ring-slate-500/30'
  return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
}

export function TrainerCard({
  trainer: t,
  onView,
  onEdit,
  onAssign,
  onToggleActive,
  onAvailability,
  onDelete,
}: Props) {
  const initials = trainerInitials(t)
  const specialities = [t.specialization, ...parseCsv(t.secondarySpecializations)].filter(
    Boolean
  ) as string[]
  const certs = parseCsv(t.certifications)
  const capacityPct =
    t.maxClients && t.maxClients > 0
      ? Math.min(100, Math.round(((t.totalClients ?? 0) / t.maxClients) * 100))
      : null
  const verified = (t.verificationStatus ?? '').toLowerCase() === 'verified'

  return (
    <div className="group glass-card relative flex flex-col overflow-hidden rounded-2xl border border-white/5 transition hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[0_12px_40px_-12px_rgba(96,165,250,0.35)]">
      {/* Cover */}
      <div className="relative h-20 w-full bg-gradient-to-br from-blue-500/40 via-purple-500/30 to-fuchsia-500/30">
        {t.coverPhoto && (
          <img src={t.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(11,11,26,0.7)]" />
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${availabilityPillClass(
              t.availabilityStatus
            )}`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {t.availabilityStatus ?? 'Available'}
          </span>
          {!t.isActive && (
            <span className="inline-flex rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Avatar + identity */}
      <div className="relative -mt-10 px-5 pb-4">
        <div className="flex items-end justify-between">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-lg font-bold text-white ring-4 ring-[rgba(11,11,26,0.9)]">
            {t.profilePicture ? (
              <img src={t.profilePicture} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {t.rating != null && (
            <div className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
              <span>★</span>
              <span>{Number(t.rating).toFixed(1)}</span>
              {t.reviewCount != null && (
                <span className="text-amber-200/70">({t.reviewCount})</span>
              )}
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold text-white">
              {trainerFullName(t)}
            </h3>
            {verified && (
              <svg
                className="size-4 shrink-0 text-sky-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                title="Verified"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <p className="truncate text-xs text-slate-400">
            {t.employeeCode ? `#${t.employeeCode} · ` : ''}
            {t.email}
          </p>
        </div>

        {/* Specialities */}
        {specialities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {specialities.slice(0, 3).map((s) => (
              <span
                key={s}
                className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-200 ring-1 ring-blue-500/20"
              >
                {s}
              </span>
            ))}
            {specialities.length > 3 && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-white/10">
                +{specialities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {t.bio && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">{t.bio}</p>
        )}

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-center">
          <div>
            <p className="text-sm font-bold text-white">
              {t.experienceYears ?? '—'}
              {t.experienceYears != null && <span className="ml-0.5 text-[10px] text-slate-400">y</span>}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Exp</p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {t.totalClients}
              {t.maxClients != null && (
                <span className="text-slate-500"> /{t.maxClients}</span>
              )}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Clients</p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {t.sessionRate != null
                ? `${t.currency ?? '₹'}${t.sessionRate}`
                : t.hourlyRate != null
                  ? `${t.currency ?? '₹'}${t.hourlyRate}`
                  : '—'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {t.sessionRate != null ? '/sess' : t.hourlyRate != null ? '/hr' : 'Rate'}
            </p>
          </div>
        </div>

        {/* Capacity bar */}
        {capacityPct != null && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
              <span>Capacity</span>
              <span>{capacityPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all ${
                  capacityPct >= 95
                    ? 'bg-rose-400'
                    : capacityPct >= 75
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-blue-400 to-purple-400'
                }`}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Certs */}
        {certs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {certs.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald-200 ring-1 ring-emerald-500/20"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Button variant="soft" size="sm" onClick={onView} className="flex-1">
            View
          </Button>
          {onEdit && (
            <Button variant="soft" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onAssign && (
            <Button variant="soft" size="sm" onClick={onAssign}>
              Assign
            </Button>
          )}
          {onAvailability && onToggleActive && onDelete && (
            <TrainerCardMenu
              isActive={t.isActive}
              onAvailability={onAvailability}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Card's overflow menu (availability + active + delete)                     */
/* -------------------------------------------------------------------------- */

function TrainerCardMenu({
  isActive,
  onAvailability,
  onToggleActive,
  onDelete,
}: {
  isActive: boolean
  onAvailability: (status: AvailabilityStatus) => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="soft"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⋯
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-white/10 bg-[rgba(11,11,26,0.95)] p-1 shadow-xl backdrop-blur"
        >
          <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">
            Set availability
          </p>
          {AVAILABILITY_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitem"
              onClick={() => {
                onAvailability(s)
                setOpen(false)
              }}
              className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 transition hover:bg-white/5"
            >
              {s}
            </button>
          ))}
          <div className="my-1 h-px bg-white/5" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggleActive()
              setOpen(false)
            }}
            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 transition hover:bg-white/5"
          >
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-rose-300 transition hover:bg-rose-500/10"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
