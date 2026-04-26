import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { Button } from '../components/ui/Button'
import { usePermission } from '../features/auth/hooks/usePermission'
import { MetricCard } from '../components/dashboard/MetricCard'
import { AddTrainerModal } from '../components/trainers/AddTrainerModal'
import { TrainerFilterBar } from '../components/trainers/TrainerFilterBar'
import { TrainerCard } from '../components/trainers/TrainerCard'
import { authService } from '../services/auth.service'
import { trainersService } from '../services/trainers.service'
import {
  DEFAULT_TRAINER_FILTERS,
  trainerFullName,
  trainerInitials,
} from '../types/trainer'
import type {
  Trainer,
  TrainerFilters,
  TrainerStats,
  AvailabilityStatus,
} from '../types/trainer'

/* ---------- local helpers ---------- */

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

const cardIcons = {
  total: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  active: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  leave: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  star: (
    <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  clients: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  bolt: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
}

/* ---------- sort options ---------- */

type SortKey = 'name' | 'rating' | 'clients' | 'experience' | 'joined'
const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'rating', label: 'Rating' },
  { key: 'clients', label: 'Clients' },
  { key: 'experience', label: 'Experience' },
  { key: 'joined', label: 'Joined date' },
]

/* ---------- page ---------- */

export function TrainersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { userName } = getDashboardUser()
  const canManageTrainers = usePermission(authService.permissionCodes.trainerAccess)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [filters, setFilters] = useState<TrainerFilters>(DEFAULT_TRAINER_FILTERS)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'rating',
    dir: 'desc',
  })

  /* data */
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['trainer-stats'],
    queryFn: async () => (await trainersService.getStats()).data,
  })
  const { data: trainers = [], isLoading: listLoading } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => (await trainersService.getAll()).data,
  })

  /* mutations */
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      trainersService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-stats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => trainersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-stats'] })
    },
  })

  /* filtering + sorting */
  const filteredTrainers = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    const arr = (trainers as Trainer[]).filter((t) => {
      if (filters.activeOnly && !t.isActive) return false
      if (filters.personalTrainerOnly && !t.isPersonalTrainer) return false
      if (
        filters.specialization !== 'All' &&
        (t.specialization ?? '').toLowerCase() !== filters.specialization.toLowerCase()
      )
        return false
      if (
        filters.availability !== 'All' &&
        ((t.availabilityStatus ?? 'Available').toString().toLowerCase() !==
          filters.availability.toLowerCase())
      )
        return false
      if (filters.minRating != null && (t.rating ?? 0) < filters.minRating) return false
      if (
        filters.minExperienceYears != null &&
        (t.experienceYears ?? 0) < filters.minExperienceYears
      )
        return false
      if (term) {
        const haystack = [
          t.firstName,
          t.lastName,
          t.email,
          t.employeeCode,
          t.specialization,
          t.secondarySpecializations,
          t.certifications,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })

    const dir = sort.dir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return trainerFullName(a).localeCompare(trainerFullName(b)) * dir
        case 'rating':
          return ((a.rating ?? -1) - (b.rating ?? -1)) * dir
        case 'clients':
          return ((a.totalClients ?? 0) - (b.totalClients ?? 0)) * dir
        case 'experience':
          return ((a.experienceYears ?? 0) - (b.experienceYears ?? 0)) * dir
        case 'joined': {
          const av = new Date(a.joiningDate ?? a.hireDate ?? 0).getTime()
          const bv = new Date(b.joiningDate ?? b.hireDate ?? 0).getTime()
          return (av - bv) * dir
        }
      }
    })

    return arr
  }, [trainers, filters, sort])

  const specializationOptions = useMemo(() => {
    const s = new Set<string>()
    ;(trainers as Trainer[]).forEach((t) => {
      if (t.specialization) s.add(t.specialization)
    })
    return Array.from(s).sort()
  }, [trainers])

  /* handlers */
  const handleView = (t: Trainer) => navigate(`/dashboard/trainers/${t.id}`)
  const handleEdit = (t: Trainer) => navigate(`/dashboard/trainers/${t.id}?mode=edit`)
  const handleAssignClient = (t: Trainer) =>
    navigate('/dashboard/users', { state: { assignTrainerId: t.id } })
  const handleDeactivate = (t: Trainer) => {
    if (!window.confirm(`Deactivate trainer "${trainerFullName(t)}"?`)) return
    updateMutation.mutate({ id: t.id, payload: { isActive: false } })
  }
  const handleActivate = (t: Trainer) =>
    updateMutation.mutate({ id: t.id, payload: { isActive: true } })
  const handleSetAvailability = (t: Trainer, status: AvailabilityStatus) =>
    updateMutation.mutate({ id: t.id, payload: { availabilityStatus: status } })
  const handleDelete = (t: Trainer) => {
    if (!window.confirm(`Permanently delete "${trainerFullName(t)}"? This cannot be undone.`))
      return
    deleteMutation.mutate(t.id)
  }

  const displayStats: TrainerStats | null = stats ?? null

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Staff"
        titleGradient="trainers"
        subtitle="Operational metrics and directory. Manage profiles, availability, clients, schedules, and performance."
        primaryAction={canManageTrainers ? { label: '+ Add trainer', onClick: () => setAddModalOpen(true) } : undefined}
      >
        {/* Overview cards */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-300">
            Operational &amp; performance metrics
          </h2>
          {statsLoading ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[100px] animate-pulse rounded-xl bg-white/10" />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <MetricCard
                title="Total Trainers"
                value={displayStats?.totalTrainers ?? 0}
                caption={
                  displayStats?.newThisMonth != null
                    ? `${displayStats.newThisMonth} joined this month`
                    : 'All time'
                }
                gradient="from-indigo-500 to-blue-500"
                icon={cardIcons.total}
              />
              <MetricCard
                title="Active"
                value={displayStats?.activeTrainers ?? 0}
                caption={
                  displayStats?.utilizationRate != null
                    ? `${displayStats.utilizationRate.toFixed(0)}% utilisation`
                    : 'Currently available'
                }
                gradient="from-emerald-500 to-teal-500"
                icon={cardIcons.active}
              />
              <MetricCard
                title="On Leave"
                value={displayStats?.onLeave ?? 0}
                caption="Unavailable today"
                gradient="from-amber-500 to-orange-500"
                icon={cardIcons.leave}
              />
              <MetricCard
                title="Avg Rating"
                value={
                  displayStats?.avgRating != null
                    ? displayStats.avgRating.toFixed(1) + ' ★'
                    : '—'
                }
                caption={
                  displayStats?.avgExperienceYears != null
                    ? `~${displayStats.avgExperienceYears.toFixed(1)} yrs avg. exp.`
                    : 'Member satisfaction'
                }
                gradient="from-yellow-500 to-amber-500"
                icon={cardIcons.star}
              />
              <MetricCard
                title="Clients Assigned"
                value={displayStats?.totalClientsAssigned ?? 0}
                caption={
                  displayStats?.avgClientsPerTrainer != null
                    ? `~${displayStats.avgClientsPerTrainer.toFixed(1)} per trainer`
                    : 'Active assignments'
                }
                gradient="from-sky-500 to-cyan-500"
                icon={cardIcons.clients}
              />
              <MetricCard
                title="Sessions MTD"
                value={displayStats?.totalSessionsThisMonth ?? 0}
                caption="Completed this month"
                gradient="from-fuchsia-500 to-pink-500"
                icon={cardIcons.bolt}
              />
            </div>
          )}
        </section>

        {/* Directory */}
        <section className="glass-card dashboard-card min-w-0 overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-6 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Trainers directory</h2>
                <p className="text-sm text-slate-400">
                  Search, filter, sort, and manage every trainer in one place.
                </p>
              </div>
              <div className="flex items-center gap-1 self-start rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  aria-pressed={view === 'grid'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    view === 'grid'
                      ? 'bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-pressed={view === 'list'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    view === 'list'
                      ? 'bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  List
                </button>
              </div>
            </div>
          </div>

          <TrainerFilterBar
            filters={filters}
            onChange={setFilters}
            specializations={specializationOptions}
            resultCount={filteredTrainers.length}
            totalCount={(trainers as Trainer[]).length}
            sort={sort}
            onSortChange={setSort}
            sortOptions={SORT_OPTIONS}
          />

          {listLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading trainers…
            </div>
          ) : filteredTrainers.length === 0 ? (
            <EmptyState onReset={() => setFilters(DEFAULT_TRAINER_FILTERS)} />
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredTrainers.map((t) => (
                <TrainerCard
                  key={t.id}
                  trainer={t}
                  onView={() => handleView(t)}
                  onEdit={canManageTrainers ? () => handleEdit(t) : undefined}
                  onAssign={canManageTrainers ? () => handleAssignClient(t) : undefined}
                  onToggleActive={
                    canManageTrainers ? () => (t.isActive ? handleDeactivate(t) : handleActivate(t)) : undefined
                  }
                  onAvailability={canManageTrainers ? (status) => handleSetAvailability(t, status) : undefined}
                  onDelete={canManageTrainers ? () => handleDelete(t) : undefined}
                />
              ))}
            </div>
          ) : (
            <TrainersTable
              trainers={filteredTrainers}
              onView={handleView}
              onEdit={canManageTrainers ? handleEdit : undefined}
              onAssign={canManageTrainers ? handleAssignClient : undefined}
              onActivate={canManageTrainers ? handleActivate : undefined}
              onDeactivate={canManageTrainers ? handleDeactivate : undefined}
            />
          )}
        </section>
      </DashboardSubpageShell>

      {canManageTrainers && (
        <AddTrainerModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
        />
      )}
    </DashboardLayout>
  )
}

/* ---------- subcomponents ---------- */

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-white/10">
        <svg className="size-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-white">No trainers match these filters</p>
      <p className="max-w-sm text-xs text-slate-400">
        Try broadening your search, lowering the minimum rating/experience, or clearing filters.
      </p>
      <Button variant="soft" size="sm" onClick={onReset} className="mt-2">
        Reset filters
      </Button>
    </div>
  )
}

function TrainersTable({
  trainers,
  onView,
  onEdit,
  onAssign,
  onActivate,
  onDeactivate,
}: {
  trainers: Trainer[]
  onView: (t: Trainer) => void
  onEdit?: (t: Trainer) => void
  onAssign?: (t: Trainer) => void
  onActivate?: (t: Trainer) => void
  onDeactivate?: (t: Trainer) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-xs">
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3">Trainer</th>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Specialization</th>
            <th className="px-4 py-3">Exp.</th>
            <th className="px-4 py-3">Clients</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Rate</th>
            <th className="px-4 py-3">Availability</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trainers.map((t) => {
            const initials = trainerInitials(t)
            const availability = (t.availabilityStatus ?? 'Available') as string
            const avLower = availability.toLowerCase()
            const avClass = avLower.includes('leave')
              ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
              : avLower.includes('busy')
                ? 'bg-orange-500/15 text-orange-300 ring-orange-500/30'
                : avLower.includes('off')
                  ? 'bg-slate-500/15 text-slate-300 ring-slate-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
            return (
              <tr
                key={t.id}
                className="border-b border-white/5 transition hover:bg-white/[0.03]"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500/60 to-purple-500/60 text-xs font-semibold text-white ring-1 ring-white/15">
                      {t.profilePicture ? (
                        <img
                          src={t.profilePicture}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{trainerFullName(t)}</p>
                      <p className="truncate text-slate-400">{t.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-300">
                  {t.employeeCode ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-slate-300">
                  <p>{t.specialization ?? '—'}</p>
                  {t.secondarySpecializations && (
                    <p className="truncate text-[10px] text-slate-500">
                      +{t.secondarySpecializations}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-300">
                  {t.experienceYears != null ? `${t.experienceYears}y` : '—'}
                </td>
                <td className="px-4 py-2.5 text-slate-300">
                  {t.totalClients}
                  {t.maxClients != null && (
                    <span className="text-slate-500"> / {t.maxClients}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {t.rating != null ? (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <span>★</span>
                      <span className="font-semibold text-white">
                        {Number(t.rating).toFixed(1)}
                      </span>
                      {t.reviewCount != null && (
                        <span className="text-slate-500">({t.reviewCount})</span>
                      )}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-300">
                  {t.sessionRate != null
                    ? `${t.currency ?? '₹'}${t.sessionRate}/sess.`
                    : t.hourlyRate != null
                      ? `${t.currency ?? '₹'}${t.hourlyRate}/hr`
                      : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${avClass}`}
                  >
                    {availability}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                      t.isActive
                        ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                        : 'bg-white/5 text-slate-400 ring-white/10'
                    }`}
                  >
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button variant="soft" size="sm" onClick={() => onView(t)}>
                      View
                    </Button>
                    {onEdit && (
                      <Button variant="soft" size="sm" onClick={() => onEdit(t)}>
                        Edit
                      </Button>
                    )}
                    {onAssign && (
                      <Button variant="soft" size="sm" onClick={() => onAssign(t)}>
                        Assign
                      </Button>
                    )}
                    {onActivate && onDeactivate && (
                      <>
                        {t.isActive ? (
                          <Button
                            variant="soft"
                            size="sm"
                            onClick={() => onDeactivate(t)}
                            className="bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="soft"
                            size="sm"
                            onClick={() => onActivate(t)}
                            className="bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                          >
                            Activate
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

