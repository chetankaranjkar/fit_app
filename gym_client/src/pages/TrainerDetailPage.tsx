import { useMemo, useState, type ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { trainersService } from '../services/trainers.service'
import {
  AVAILABILITY_STATUSES,
  VERIFICATION_STATUSES,
  parseCsv,
  trainerFullName,
  trainerInitials,
} from '../types/trainer'
import type {
  Trainer,
  UpdateTrainerDto,
  TrainerReview,
  TrainerAvailabilitySlot,
  TrainerEarningsSummary,
  AvailabilityStatus,
} from '../types/trainer'

/* ------------------------------------------------------------------ */
/*                              Helpers                                */
/* ------------------------------------------------------------------ */

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

function formatMonths(fromIso?: string | null) {
  if (!fromIso) return '—'
  const from = new Date(fromIso)
  if (Number.isNaN(from.getTime())) return '—'
  const diff = Date.now() - from.getTime()
  const years = diff / (365.25 * 24 * 3600 * 1000)
  if (years < 1) return `${Math.max(1, Math.round(years * 12))} mo`
  return `${years.toFixed(1)} yrs`
}

function availabilityPillClass(raw?: string | null) {
  const s = (raw ?? 'Available').toLowerCase()
  if (s.includes('leave')) return 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
  if (s.includes('busy')) return 'bg-orange-500/15 text-orange-300 ring-orange-500/30'
  if (s.includes('off')) return 'bg-slate-500/15 text-slate-300 ring-slate-500/30'
  return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
}

/* ------------------------------------------------------------------ */
/*                               Tabs                                   */
/* ------------------------------------------------------------------ */

type TabId = 'Overview' | 'Clients' | 'Schedule' | 'Reviews' | 'Performance' | 'Settings'

const TAB_META: { id: TabId; icon: ReactNode }[] = [
  {
    id: 'Overview',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    id: 'Clients',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    id: 'Schedule',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: 'Reviews',
    icon: (
      <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    id: 'Performance',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 4 7-8m0 0v5m0-5h-5" />
      </svg>
    ),
  },
  {
    id: 'Settings',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

/* ------------------------------------------------------------------ */
/*                              Page                                    */
/* ------------------------------------------------------------------ */

export function TrainerDetailPage() {
  const { trainerId } = useParams<{ trainerId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = trainerId ? parseInt(trainerId, 10) : NaN
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const initialTab = searchParams.get('tab') as TabId | null
  const [activeTab, setActiveTab] = useState<TabId>(
    TAB_META.some((t) => t.id === initialTab) ? (initialTab as TabId) : 'Overview'
  )
  const [editOpen, setEditOpen] = useState(searchParams.get('mode') === 'edit')

  const {
    data: trainer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['trainer', id],
    queryFn: async () => (await trainersService.getById(id)).data,
    enabled: !Number.isNaN(id),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateTrainerDto) => trainersService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer', id] })
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
    },
  })

  if (Number.isNaN(id)) {
    return (
      <DashboardLayout userName={userName}>
        <FallbackMessage title="Invalid trainer" message="The trainer ID in the URL is invalid." />
      </DashboardLayout>
    )
  }
  if (isLoading) {
    return (
      <DashboardLayout userName={userName}>
        <FallbackMessage title="Loading trainer…" message="Fetching the trainer profile." loading />
      </DashboardLayout>
    )
  }
  if (error || !trainer) {
    return (
      <DashboardLayout userName={userName}>
        <FallbackMessage
          title="Trainer not found"
          message="We couldn't load this trainer. They may have been removed."
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <div className="min-w-0 max-w-[100%] space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => navigate('/dashboard/trainers')}
            className="transition hover:text-white"
          >
            Trainers
          </button>
          <span>›</span>
          <span className="text-slate-300">{trainerFullName(trainer)}</span>
        </div>

        <HeroHeader
          trainer={trainer}
          onBack={() => navigate('/dashboard/trainers')}
          onEdit={() => setEditOpen(true)}
          onAvailabilityChange={(s) =>
            updateMutation.mutate({ availabilityStatus: s })
          }
          onToggleActive={() =>
            updateMutation.mutate({ isActive: !trainer.isActive })
          }
        />

        {/* Stats strip */}
        <StatsStrip trainer={trainer} />

        {/* Tab bar */}
        <div className="glass-card sticky top-0 z-10 flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl p-1">
          {TAB_META.map((tab) => {
            const on = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={on}
                role="tab"
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  on
                    ? 'bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-white shadow-lg shadow-purple-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.id}
              </button>
            )
          })}
        </div>

        {/* Panels */}
        <div>
          {activeTab === 'Overview' && <OverviewTab trainer={trainer} />}
          {activeTab === 'Clients' && <ClientsTab trainerId={trainer.id} />}
          {activeTab === 'Schedule' && <ScheduleTab trainerId={trainer.id} trainer={trainer} />}
          {activeTab === 'Reviews' && <ReviewsTab trainer={trainer} />}
          {activeTab === 'Performance' && <PerformanceTab trainerId={trainer.id} />}
          {activeTab === 'Settings' && (
            <SettingsTab
              trainer={trainer}
              onUpdate={(payload) => updateMutation.mutate(payload)}
              onDelete={async () => {
                if (!window.confirm('Delete this trainer permanently?')) return
                await trainersService.delete(trainer.id)
                queryClient.invalidateQueries({ queryKey: ['trainers'] })
                navigate('/dashboard/trainers')
              }}
            />
          )}
        </div>
      </div>

      <EditTrainerModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        trainer={trainer}
        onSave={(payload) => {
          updateMutation.mutate(payload, {
            onSuccess: () => setEditOpen(false),
          })
        }}
      />
    </DashboardLayout>
  )
}

/* ------------------------------------------------------------------ */
/*                               Hero                                   */
/* ------------------------------------------------------------------ */

function HeroHeader({
  trainer: t,
  onBack,
  onEdit,
  onAvailabilityChange,
  onToggleActive,
}: {
  trainer: Trainer
  onBack: () => void
  onEdit: () => void
  onAvailabilityChange: (s: AvailabilityStatus) => void
  onToggleActive: () => void
}) {
  const initials = trainerInitials(t)
  const verified = (t.verificationStatus ?? '').toLowerCase() === 'verified'

  return (
    <section className="glass-card relative overflow-hidden rounded-2xl">
      {/* Cover */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-blue-500/30 via-purple-500/25 to-fuchsia-500/25">
        {t.coverPhoto && (
          <img src={t.coverPhoto} alt="" className="h-full w-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(11,11,26,0.9)]" />
      </div>

      <div className="relative px-6 py-6 pt-28 sm:px-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-5">
            <div className="flex size-28 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-2xl font-bold text-white ring-4 ring-[rgba(11,11,26,0.9)]">
              {t.profilePicture ? (
                <img src={t.profilePicture} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">
                  {trainerFullName(t)}
                </h1>
                {verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/30">
                    <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${availabilityPillClass(
                    t.availabilityStatus
                  )}`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {t.availabilityStatus ?? 'Available'}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                    t.isActive
                      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                      : 'bg-white/5 text-slate-400 ring-white/10'
                  }`}
                >
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-slate-300">
                {t.specialization ?? 'No specialization set'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {t.employeeCode ? `#${t.employeeCode} · ` : ''}
                {t.email}
                {t.phone ? ` · ${t.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Change availability"
              value={t.availabilityStatus ?? 'Available'}
              onChange={(e) =>
                onAvailabilityChange(e.target.value as AvailabilityStatus)
              }
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            >
              {AVAILABILITY_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
            <Button variant="soft" size="sm" onClick={onToggleActive}>
              {t.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="soft" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <Button size="sm" onClick={onEdit}>
              Edit profile
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*                            Stats strip                               */
/* ------------------------------------------------------------------ */

function StatsStrip({ trainer: t }: { trainer: Trainer }) {
  const capacityPct =
    t.maxClients && t.maxClients > 0
      ? Math.min(100, Math.round(((t.totalClients ?? 0) / t.maxClients) * 100))
      : null

  const items: Array<{ label: string; value: string; sub?: string; accent: string }> = [
    {
      label: 'Rating',
      value: t.rating != null ? `${Number(t.rating).toFixed(1)} ★` : '—',
      sub: t.reviewCount != null ? `${t.reviewCount} reviews` : 'No reviews yet',
      accent: 'from-yellow-400 to-amber-500',
    },
    {
      label: 'Active clients',
      value: String(t.totalClients ?? 0),
      sub: t.maxClients ? `of ${t.maxClients} max (${capacityPct}%)` : 'No cap set',
      accent: 'from-sky-400 to-cyan-500',
    },
    {
      label: 'Experience',
      value: t.experienceYears != null ? `${t.experienceYears} yrs` : '—',
      sub: `Hired ${formatMonths(t.joiningDate ?? t.hireDate)} ago`,
      accent: 'from-emerald-400 to-teal-500',
    },
    {
      label: 'Sessions',
      value: (t.totalSessionsConducted ?? 0).toLocaleString(),
      sub: 'All-time conducted',
      accent: 'from-fuchsia-400 to-pink-500',
    },
    {
      label: 'Rate',
      value:
        t.sessionRate != null
          ? `${t.currency ?? '₹'}${t.sessionRate}`
          : t.hourlyRate != null
            ? `${t.currency ?? '₹'}${t.hourlyRate}`
            : '—',
      sub:
        t.sessionRate != null
          ? 'per session'
          : t.hourlyRate != null
            ? 'per hour'
            : 'Not set',
      accent: 'from-indigo-400 to-blue-500',
    },
    {
      label: 'Retention',
      value:
        t.retentionRate != null ? `${Math.round(t.retentionRate * 100)}%` : '—',
      sub: 'Client retention',
      accent: 'from-violet-400 to-purple-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((i) => (
        <div
          key={i.label}
          className="glass-card relative overflow-hidden rounded-2xl p-4"
        >
          <div
            aria-hidden
            className={`pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-gradient-to-br ${i.accent} opacity-20 blur-2xl`}
          />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {i.label}
          </p>
          <p className="mt-1.5 text-xl font-bold text-white">{i.value}</p>
          {i.sub && <p className="mt-0.5 truncate text-[11px] text-slate-500">{i.sub}</p>}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                             Overview                                 */
/* ------------------------------------------------------------------ */

function OverviewTab({ trainer: t }: { trainer: Trainer }) {
  const specialties = [t.specialization, ...parseCsv(t.secondarySpecializations)].filter(
    Boolean
  ) as string[]
  const certs = parseCsv(t.certifications)
  const workingDays = parseCsv(t.workingDays)
  const languages = parseCsv(t.languagesSpoken)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Bio */}
      <div className="glass-card rounded-2xl p-6 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          About
        </h3>
        {t.bio ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{t.bio}</p>
        ) : (
          <p className="text-sm text-slate-500">No bio has been added yet.</p>
        )}

        {specialties.length > 0 && (
          <>
            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Specialities
            </h3>
            <div className="flex flex-wrap gap-2">
              {specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200 ring-1 ring-blue-500/20"
                >
                  {s}
                </span>
              ))}
            </div>
          </>
        )}

        {certs.length > 0 && (
          <>
            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Certifications
            </h3>
            <div className="flex flex-wrap gap-2">
              {certs.map((c) => (
                <span
                  key={c}
                  className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-mono text-emerald-200 ring-1 ring-emerald-500/20"
                >
                  {c}
                </span>
              ))}
            </div>
            {t.certificationDetails && (
              <p className="mt-2 text-xs text-slate-400">{t.certificationDetails}</p>
            )}
          </>
        )}

        {languages.length > 0 && (
          <>
            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {languages.map((l) => (
                <span
                  key={l}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10"
                >
                  {l}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Side info */}
      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Employment
          </h3>
          <Row label="Employee code" value={t.employeeCode ?? '—'} />
          <Row label="Type" value={t.employmentType ?? '—'} />
          <Row
            label="Personal trainer"
            value={t.isPersonalTrainer ? 'Yes' : 'No'}
          />
          <Row label="Joined" value={formatDate(t.joiningDate ?? t.hireDate)} />
          {t.terminationDate && (
            <Row label="Terminated" value={formatDate(t.terminationDate)} />
          )}
          <Row
            label="Verification"
            value={t.verificationStatus ?? VERIFICATION_STATUSES[0]}
          />
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Availability
          </h3>
          <Row
            label="Status"
            value={t.availabilityStatus ?? 'Available'}
          />
          <Row
            label="Working days"
            value={workingDays.length ? workingDays.join(', ') : '—'}
          />
          <Row
            label="Hours"
            value={
              t.workingHoursStart && t.workingHoursEnd
                ? `${t.workingHoursStart} – ${t.workingHoursEnd}`
                : '—'
            }
          />
          <Row
            label="Capacity"
            value={
              t.maxClients != null
                ? `${t.totalClients}/${t.maxClients}`
                : `${t.totalClients}`
            }
          />
        </div>

        {(t.instagramUrl || t.linkedinUrl || t.websiteUrl) && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Connect
            </h3>
            <div className="flex flex-wrap gap-2">
              {t.instagramUrl && (
                <a
                  href={t.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                >
                  Instagram
                </a>
              )}
              {t.linkedinUrl && (
                <a
                  href={t.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                >
                  LinkedIn
                </a>
              )}
              {t.websiteUrl && (
                <a
                  href={t.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                >
                  Website
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-none">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="max-w-[60%] truncate text-right text-xs text-slate-200">{value}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                              Clients                                 */
/* ------------------------------------------------------------------ */

function ClientsTab({ trainerId }: { trainerId: number }) {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['trainer-clients', trainerId],
    queryFn: async () => {
      try {
        const { data } = await trainersService.getAssignedClients(trainerId)
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
  })

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center text-sm text-slate-400">
        Loading clients…
      </div>
    )
  }
  if (clients.length === 0) {
    return (
      <EmptyPanel
        title="No clients assigned yet"
        message="Assign members to this trainer from the Users directory."
      />
    )
  }

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Assigned</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr
              key={c.userId}
              className="border-b border-white/5 transition hover:bg-white/[0.03]"
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/60 to-purple-500/60 text-[11px] font-semibold text-white">
                    {(c.firstName?.[0] ?? '') + (c.lastName?.[0] ?? '')}
                  </div>
                  <p className="font-medium text-white">
                    {c.firstName} {c.lastName}
                  </p>
                </div>
              </td>
              <td className="px-4 py-2.5 text-slate-300">{c.email ?? '—'}</td>
              <td className="px-4 py-2.5 text-slate-300">{c.membershipPlan ?? '—'}</td>
              <td className="px-4 py-2.5 text-slate-300">
                {formatDate(c.assignedOn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                             Schedule                                 */
/* ------------------------------------------------------------------ */

function ScheduleTab({ trainerId, trainer }: { trainerId: number; trainer: Trainer }) {
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['trainer-schedule', trainerId],
    queryFn: async () => {
      try {
        const { data } = await trainersService.getSchedule(trainerId)
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
  })

  const workingDays = parseCsv(trainer.workingDays)

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Weekly availability
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((d) => {
            const on = workingDays.includes(d)
            return (
              <div
                key={d}
                className={`rounded-xl border p-3 text-center ${
                  on
                    ? 'border-blue-400/30 bg-blue-500/10 text-blue-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-500'
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider">{d}</p>
                <p className="mt-1 text-xs font-bold">
                  {on && trainer.workingHoursStart && trainer.workingHoursEnd
                    ? `${trainer.workingHoursStart.slice(0, 5)}–${trainer.workingHoursEnd.slice(0, 5)}`
                    : on
                      ? '—'
                      : 'Off'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Upcoming sessions</h3>
          <p className="text-xs text-slate-400">Booked slots from the schedule service.</p>
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading schedule…</div>
        ) : slots.length === 0 ? (
          <EmptyPanel
            title="No booked slots"
            message="Once clients book sessions or you add slots manually, they'll show up here."
            flush
          />
        ) : (
          <ScheduleList slots={slots} />
        )}
      </div>
    </div>
  )
}

function ScheduleList({ slots }: { slots: TrainerAvailabilitySlot[] }) {
  return (
    <div className="divide-y divide-white/5">
      {slots.map((s) => (
        <div key={s.id} className="flex items-center gap-4 px-6 py-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-200 ring-1 ring-blue-500/20">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {s.clientName ?? 'Open slot'} — {s.sessionType ?? 'Training'}
            </p>
            <p className="truncate text-xs text-slate-400">
              {s.date ? formatDate(s.date) : 'Recurring'} · {s.startTime}–{s.endTime}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
              s.isBooked
                ? 'bg-blue-500/15 text-blue-200 ring-blue-500/30'
                : 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'
            }`}
          >
            {s.isBooked ? 'Booked' : 'Open'}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                              Reviews                                 */
/* ------------------------------------------------------------------ */

function ReviewsTab({ trainer }: { trainer: Trainer }) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['trainer-reviews', trainer.id],
    queryFn: async () => {
      try {
        const { data } = await trainersService.getReviews(trainer.id)
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
  })

  const distribution = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]
    reviews.forEach((r) => {
      const idx = Math.max(0, Math.min(4, Math.round(r.rating) - 1))
      buckets[idx] += 1
    })
    return buckets
  }, [reviews])

  const totalReviews = reviews.length

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Summary */}
      <div className="glass-card rounded-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Overall rating
        </p>
        <p className="mt-1 text-5xl font-bold text-white">
          {trainer.rating != null ? Number(trainer.rating).toFixed(1) : '—'}
        </p>
        <p className="text-xs text-slate-400">
          {totalReviews} review{totalReviews !== 1 ? 's' : ''}
        </p>
        <div className="mt-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1]
            const pct = totalReviews ? Math.round((count / totalReviews) * 100) : 0
            return (
              <div key={star} className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-4 text-right">{star}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-500">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reviews list */}
      <div className="lg:col-span-2">
        {isLoading ? (
          <div className="glass-card rounded-2xl p-10 text-center text-sm text-slate-400">
            Loading reviews…
          </div>
        ) : totalReviews === 0 ? (
          <EmptyPanel
            title="No reviews yet"
            message="Once clients rate sessions, their reviews will appear here."
          />
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewRow key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ review }: { review: TrainerReview }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/60 to-purple-500/60 text-xs font-semibold text-white">
          {review.userName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{review.userName}</p>
          <p className="truncate text-[11px] text-slate-400">{formatDate(review.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-amber-300">
          <span>★</span>
          {Number(review.rating).toFixed(1)}
        </div>
      </div>
      {review.comment && (
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{review.comment}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                           Performance                                */
/* ------------------------------------------------------------------ */

function PerformanceTab({ trainerId }: { trainerId: number }) {
  const { data, isLoading } = useQuery<TrainerEarningsSummary | null>({
    queryKey: ['trainer-earnings', trainerId],
    queryFn: async () => {
      try {
        const { data } = await trainersService.getEarnings(trainerId)
        return data
      } catch {
        return null
      }
    },
  })

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center text-sm text-slate-400">
        Loading performance…
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyPanel
        title="No performance data yet"
        message="Earnings and session metrics will surface here once the backend endpoint is available."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="MTD earnings" value={`${data.currency}${data.totalThisMonth.toLocaleString()}`} />
        <KPI label="Year to date" value={`${data.currency}${data.totalThisYear.toLocaleString()}`} />
        <KPI label="All-time" value={`${data.currency}${data.totalAllTime.toLocaleString()}`} />
        <KPI label="Avg / session" value={`${data.currency}${data.averagePerSession.toFixed(0)}`} />
      </div>

      <div className="glass-card rounded-2xl p-4">
        <h3 className="mb-3 px-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Monthly earnings
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={data.monthlySeries}>
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(11,11,26,0.95)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: 12,
                  fontSize: 12,
                  color: '#e2e8f0',
                }}
              />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="#60a5fa"
                fill="url(#earningsGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                             Settings                                 */
/* ------------------------------------------------------------------ */

function SettingsTab({
  trainer,
  onUpdate,
  onDelete,
}: {
  trainer: Trainer
  onUpdate: (p: UpdateTrainerDto) => void
  onDelete: () => void
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Verification
        </h3>
        <p className="mb-4 text-xs text-slate-400">
          Mark this trainer as verified once their certifications and identity have been confirmed.
        </p>
        <div className="flex flex-wrap gap-2">
          {VERIFICATION_STATUSES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onUpdate({ verificationStatus: v })}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                trainer.verificationStatus === v
                  ? 'bg-sky-500/20 text-sky-100 ring-sky-400/40'
                  : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Termination
        </h3>
        <p className="mb-4 text-xs text-slate-400">
          Record termination date and reason. Deactivating will hide this trainer from booking.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Termination date
            </label>
            <input
              type="date"
              aria-label="Termination date"
              defaultValue={trainer.terminationDate?.slice(0, 10) ?? ''}
              onBlur={(e) => onUpdate({ terminationDate: e.target.value || null })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
          <Input
            label="Reason"
            defaultValue={trainer.terminationReason ?? ''}
            onBlur={(e) => onUpdate({ terminationReason: e.target.value || null })}
            placeholder="Optional"
          />
        </div>
        <div className="mt-4">
          <Button
            variant="soft"
            className="w-full bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
            onClick={onDelete}
          >
            Delete trainer permanently
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                           Edit modal                                 */
/* ------------------------------------------------------------------ */

function EditTrainerModal({
  open,
  onClose,
  trainer,
  onSave,
}: {
  open: boolean
  onClose: () => void
  trainer: Trainer
  onSave: (p: UpdateTrainerDto) => void
}) {
  const [form, setForm] = useState<UpdateTrainerDto>({
    employeeCode: trainer.employeeCode,
    specialization: trainer.specialization,
    secondarySpecializations: trainer.secondarySpecializations,
    certifications: trainer.certifications,
    experienceYears: trainer.experienceYears ?? undefined,
    bio: trainer.bio,
    profilePicture: trainer.profilePicture,
    languagesSpoken: trainer.languagesSpoken,
    sessionRate: trainer.sessionRate ?? undefined,
    hourlyRate: trainer.hourlyRate ?? undefined,
    currency: trainer.currency ?? '₹',
    maxClients: trainer.maxClients ?? undefined,
    workingDays: trainer.workingDays,
    workingHoursStart: trainer.workingHoursStart,
    workingHoursEnd: trainer.workingHoursEnd,
    instagramUrl: trainer.instagramUrl,
    linkedinUrl: trainer.linkedinUrl,
    websiteUrl: trainer.websiteUrl,
  })

  const handle = <K extends keyof UpdateTrainerDto>(key: K, value: UpdateTrainerDto[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const labelCls = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'
  const ctrl =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

  return (
    <Modal open={open} onClose={onClose} title="Edit trainer" size="wide" scrollable>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Employee code"
            value={form.employeeCode ?? ''}
            onChange={(e) => handle('employeeCode', e.target.value)}
          />
          <Input
            label="Specialization"
            value={form.specialization ?? ''}
            onChange={(e) => handle('specialization', e.target.value)}
          />
          <Input
            label="Secondary (comma-sep.)"
            value={form.secondarySpecializations ?? ''}
            onChange={(e) => handle('secondarySpecializations', e.target.value)}
          />
          <Input
            label="Certifications"
            value={form.certifications ?? ''}
            onChange={(e) => handle('certifications', e.target.value)}
          />
          <Input
            label="Languages"
            value={form.languagesSpoken ?? ''}
            onChange={(e) => handle('languagesSpoken', e.target.value)}
          />
          <Input
            label="Experience (years)"
            type="number"
            min={0}
            value={form.experienceYears ?? ''}
            onChange={(e) =>
              handle('experienceYears', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input
            label="Currency"
            value={form.currency ?? ''}
            onChange={(e) => handle('currency', e.target.value)}
          />
          <Input
            label="Session rate"
            type="number"
            min={0}
            value={form.sessionRate ?? ''}
            onChange={(e) =>
              handle('sessionRate', e.target.value ? Number(e.target.value) : null)
            }
          />
          <Input
            label="Hourly rate"
            type="number"
            min={0}
            value={form.hourlyRate ?? ''}
            onChange={(e) =>
              handle('hourlyRate', e.target.value ? Number(e.target.value) : null)
            }
          />
          <Input
            label="Max clients"
            type="number"
            min={0}
            value={form.maxClients ?? ''}
            onChange={(e) =>
              handle('maxClients', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>

        <div>
          <label className={labelCls}>Bio</label>
          <textarea
            aria-label="Bio"
            value={form.bio ?? ''}
            onChange={(e) => handle('bio', e.target.value)}
            rows={3}
            className={ctrl}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Working days (CSV)"
            value={form.workingDays ?? ''}
            onChange={(e) => handle('workingDays', e.target.value)}
            placeholder="Mon,Tue,Wed,Fri"
          />
          <Input
            label="Hours start"
            type="time"
            value={form.workingHoursStart ?? ''}
            onChange={(e) => handle('workingHoursStart', e.target.value)}
          />
          <Input
            label="Hours end"
            type="time"
            value={form.workingHoursEnd ?? ''}
            onChange={(e) => handle('workingHoursEnd', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Instagram"
            value={form.instagramUrl ?? ''}
            onChange={(e) => handle('instagramUrl', e.target.value)}
          />
          <Input
            label="LinkedIn"
            value={form.linkedinUrl ?? ''}
            onChange={(e) => handle('linkedinUrl', e.target.value)}
          />
          <Input
            label="Website"
            value={form.websiteUrl ?? ''}
            onChange={(e) => handle('websiteUrl', e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*                             Fallbacks                                */
/* ------------------------------------------------------------------ */

function FallbackMessage({
  title,
  message,
  loading = false,
}: {
  title: string
  message: string
  loading?: boolean
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-white/10">
        {loading ? (
          <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
        ) : (
          <svg className="size-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="max-w-sm text-sm text-slate-400">{message}</p>
    </div>
  )
}

function EmptyPanel({
  title,
  message,
  flush = false,
}: {
  title: string
  message: string
  flush?: boolean
}) {
  return (
    <div
      className={`${
        flush ? '' : 'glass-card rounded-2xl'
      } flex flex-col items-center justify-center gap-2 py-14 text-center`}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
        <svg className="size-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="max-w-sm text-xs text-slate-400">{message}</p>
    </div>
  )
}
