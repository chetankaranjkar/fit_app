import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { usersService } from '../services/users.service'
import { dietPlansService } from '../services/dietPlans.service'
import { userDietPlansService } from '../services/userDietPlans.service'
import type { User } from '../types/user'
import type { DietPlanDto } from '../types/dietPlan'
import type { UserDietPlanDto, CreateUserDietPlanDto } from '../types/dietPlan'

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

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 transition-colors focus:border-amber-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-amber-400/20'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'

function getDefaultForm(): CreateUserDietPlanDto & { userId: number; dietPlanId: number } {
  const today = new Date().toISOString().slice(0, 10)
  return {
    userId: 0,
    dietPlanId: 0,
    startDate: today,
    endDate: undefined,
    isActive: true,
    notes: '',
  }
}

const avatarPalette = [
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-indigo-500',
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
]

const pickPalette = (seed: number | string) => {
  const str = String(seed)
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return avatarPalette[Math.abs(hash) % avatarPalette.length]
}

const getInitials = (name?: string | null, fallback?: number) => {
  if (!name) return `#${fallback ?? '?'}`
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const daysBetween = (start?: string | null, end?: string | null) => {
  if (!start) return null
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  if (Number.isNaN(s) || Number.isNaN(e)) return null
  return Math.max(0, Math.round((e - s) / 86400000))
}

export function AssignDietPlansPage() {
  const { userName: dashboardUserName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const presetUserId = Number.parseInt(searchParams.get('userId') ?? '', 10)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(getDefaultForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await usersService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['diet-plans'],
    queryFn: async () => {
      const { data } = await dietPlansService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['user-diet-plans'],
    queryFn: async () => {
      const { data } = await userDietPlansService.getAssignments()
      return data
    },
  })

  useEffect(() => {
    if (!Number.isInteger(presetUserId) || presetUserId <= 0) return
    setForm((f) => ({ ...f, userId: presetUserId }))
    setModalOpen(true)
  }, [presetUserId])

  const assignMutation = useMutation({
    mutationFn: (dto: CreateUserDietPlanDto) => userDietPlansService.assign(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-diet-plans'] })
      queryClient.invalidateQueries({ queryKey: ['userDietPlans'] })
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['userDietPlans', variables.userId] })
      }
      setModalOpen(false)
      setForm(getDefaultForm())
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to assign diet plan'),
  })

  const unassignMutation = useMutation({
    mutationFn: (id: number) => userDietPlansService.unassign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-diet-plans'] })
      queryClient.invalidateQueries({ queryKey: ['userDietPlans'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.userId || !form.dietPlanId) {
      setFormError('Please select a user and a diet plan.')
      return
    }
    const existingForUser = assignments.filter(
      (a) => a.userId === form.userId && a.isActive,
    )
    if (existingForUser.length > 0 && (form.isActive ?? true)) {
      const name = existingForUser[0]?.dietPlanName ?? 'a diet plan'
      if (
        !window.confirm(
          `This member already has "${name}" active. Assigning will replace it with the new plan. Continue?`,
        )
      ) {
        return
      }
    }
    assignMutation.mutate({
      userId: form.userId,
      dietPlanId: form.dietPlanId,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      isActive: form.isActive ?? true,
      notes: form.notes || undefined,
    })
  }

  const handleUnassign = (a: UserDietPlanDto) => {
    if (!window.confirm(`Remove assignment of "${a.dietPlanName}" from "${a.userName}"?`)) return
    unassignMutation.mutate(a.id)
  }

  const formatMemberLabel = (u: User) => `${u.firstName} ${u.lastName}`.trim() || `User #${u.id}`

  const stats = useMemo(() => {
    const total = assignments.length
    const active = assignments.filter((a) => a.isActive).length
    const inactive = total - active
    const uniqueUsers = new Set(assignments.map((a) => a.userId)).size
    return { total, active, inactive, uniqueUsers }
  }, [assignments])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assignments.filter((a) => {
      if (statusFilter === 'active' && !a.isActive) return false
      if (statusFilter === 'inactive' && a.isActive) return false
      if (!q) return true
      return (
        (a.userName ?? '').toLowerCase().includes(q) ||
        (a.dietPlanName ?? '').toLowerCase().includes(q) ||
        (a.notes ?? '').toLowerCase().includes(q)
      )
    })
  }, [assignments, statusFilter, search])

  return (
    <DashboardLayout userName={dashboardUserName}>
      <div className="min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">Nutrition · Assignments</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Assign{' '}
              <span className="bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] bg-clip-text text-transparent">
                diet plans
              </span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Roll plans out to members. Track start &amp; end dates, toggle active state, and leave notes for every
              assignment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Assign plan
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Total assigns"
            value={stats.total}
            caption="All records"
            gradient="from-amber-400 to-orange-500"
            icon={
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <KpiCard
            label="Currently active"
            value={stats.active}
            caption={stats.total ? `${Math.round((stats.active / stats.total) * 100)}% of all` : '—'}
            gradient="from-emerald-400 to-teal-500"
            icon={
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <KpiCard
            label="Inactive"
            value={stats.inactive}
            caption="Paused or ended"
            gradient="from-slate-400 to-slate-600"
            icon={
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m-9 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <KpiCard
            label="Unique members"
            value={stats.uniqueUsers}
            caption="On any plan"
            gradient="from-violet-400 to-fuchsia-500"
            icon={
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zM21 9a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>

        {/* Controls */}
        <div className="glass-card flex flex-col gap-3 rounded-2xl border border-white/10 p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member, plan, or note…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-amber-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
          <div className="flex gap-2">
            <StatusPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="All" count={stats.total} />
            <StatusPill
              active={statusFilter === 'active'}
              onClick={() => setStatusFilter('active')}
              label="Active"
              count={stats.active}
              tone="emerald"
            />
            <StatusPill
              active={statusFilter === 'inactive'}
              onClick={() => setStatusFilter('inactive')}
              label="Inactive"
              count={stats.inactive}
              tone="slate"
            />
          </div>
        </div>

        {/* Assignment cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyAssign onAdd={() => setModalOpen(true)} hasQuery={!!search || statusFilter !== 'all'} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => (
              <AssignmentCard key={a.id} a={a} onRemove={() => handleUnassign(a)} />
            ))}
          </div>
        )}
      </div>

      {/* Assign modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setFormError(null)
        }}
        title="Assign diet plan"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              role="alert"
            >
              {formError}
            </p>
          )}
          <div>
            <label className={labelClass}>Member</label>
            <select
              aria-label="Select user"
              value={form.userId || ''}
              onChange={(e) => setForm((f) => ({ ...f, userId: Number(e.target.value) }))}
              className={selectClass}
              required
            >
              <option value="" className="bg-slate-900">
                Select member
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900">
                  {formatMemberLabel(u)} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Diet plan</label>
            <select
              aria-label="Select diet plan"
              value={form.dietPlanId || ''}
              onChange={(e) => setForm((f) => ({ ...f, dietPlanId: Number(e.target.value) }))}
              className={selectClass}
              required
            >
              <option value="" className="bg-slate-900">
                Select diet plan
              </option>
              {plans.map((p: DietPlanDto) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.planName} ({p.calories} cal · {p.goalType})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <Input
              label="End date (optional)"
              type="date"
              value={form.endDate ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  endDate: e.target.value || undefined,
                }))
              }
            />
          </div>
          <Input
            label="Notes (optional)"
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || undefined }))}
            placeholder="Preferences, allergies, reminders…"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-400/40"
            />
            <span className="text-sm text-slate-300">Mark as active now</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

/* ----------------------------- Subcomponents ----------------------------- */

function KpiCard({
  label,
  value,
  caption,
  icon,
  gradient,
}: {
  label: string
  value: string | number
  caption: string
  icon: React.ReactNode
  gradient: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-30`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{caption}</p>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusPill({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  tone?: 'emerald' | 'slate'
}) {
  const toneClass = active
    ? tone === 'emerald'
      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
      : tone === 'slate'
        ? 'border-slate-400/30 bg-slate-500/15 text-slate-100'
        : 'border-amber-400/50 bg-amber-500/15 text-amber-100'
    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${toneClass}`}
    >
      {label}
      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
    </button>
  )
}

function EmptyAssign({ onAdd, hasQuery }: { onAdd: () => void; hasQuery: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
      <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-xl shadow-orange-500/30">
        <svg className="size-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white">
        {hasQuery ? 'No assignments match' : 'No assignments yet'}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
        {hasQuery
          ? 'Try clearing filters or searching a different keyword.'
          : 'Pair a diet plan with a member, set dates, and you’re live.'}
      </p>
      {!hasQuery && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110"
        >
          + Assign first plan
        </button>
      )}
    </div>
  )
}

function AssignmentCard({ a, onRemove }: { a: UserDietPlanDto; onRemove: () => void }) {
  const initials = getInitials(a.userName, a.userId)
  const palette = pickPalette(a.userId ?? a.userName ?? '?')
  const days = daysBetween(a.startDate, a.endDate)
  const isEnded = a.endDate ? new Date(a.endDate).getTime() < Date.now() : false

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-2xl">
      {/* top accent */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${palette} opacity-60`}
      />
      {/* glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-gradient-to-br ${palette} opacity-15 blur-3xl transition-opacity group-hover:opacity-25`}
      />

      <div className="flex items-start gap-3">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${palette} text-sm font-bold text-white shadow-lg`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {a.userName ?? `User #${a.userId}`}
            </h3>
            {a.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-slate-400/20">
                <span className="size-1.5 rounded-full bg-slate-400" />
                Inactive
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            <span className="text-slate-500">Plan:</span>{' '}
            <span className="font-semibold text-slate-200">
              {a.dietPlanName ?? `Plan #${a.dietPlanId}`}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove assignment"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/15"
        >
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          <span>Start</span>
          <span>{a.endDate ? 'End' : 'Ongoing'}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">
            {a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'}
          </span>
          <div className="relative flex-1">
            <div className="h-1 rounded-full bg-white/5 ring-1 ring-white/10" />
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${
                a.isActive && !isEnded ? 'from-emerald-400 to-teal-500' : 'from-slate-400 to-slate-600'
              }`}
              style={{ width: a.endDate ? '100%' : '60%' }}
            />
            {!a.endDate && (
              <div className="absolute -top-0.5 right-0 size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </div>
          <span className="text-xs font-semibold text-slate-200">
            {a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {days != null ? (
              <>
                <strong className="text-slate-200">{days}</strong> day{days === 1 ? '' : 's'}{' '}
                {a.endDate ? 'duration' : 'so far'}
              </>
            ) : (
              '—'
            )}
          </span>
          {isEnded && !a.isActive && (
            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Ended
            </span>
          )}
        </div>
      </div>

      {a.notes && (
        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Notes</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-300">{a.notes}</p>
        </div>
      )}
    </div>
  )
}
