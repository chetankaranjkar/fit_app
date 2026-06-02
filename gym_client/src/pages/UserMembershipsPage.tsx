import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { DashboardMetricsGrid } from '../components/layout/DashboardMetricsGrid'
import { MetricCard } from '../components/dashboard/MetricCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { userMembershipsService } from '../services/userMemberships.service'
import { usersService } from '../services/users.service'
import { membershipPlansService } from '../services/membershipPlans.service'
import type {
  UserMembership,
  CreateUserMembershipDto,
  UpdateUserMembershipDto,
} from '../types/userMembership'
import type { MembershipStatus } from '../types/userMembership'

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

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

const statusOptions: MembershipStatus[] = ['Active', 'Expired', 'Paused']

/** Add days to a date string (YYYY-MM-DD), return YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) return dateStr
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const defaultCreate: CreateUserMembershipDto = {
  userId: 0,
  planId: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  status: 'Active',
}

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'

const membershipMetricIcons = {
  total: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  active: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  paused: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  expired: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export function UserMembershipsPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserMembership | null>(null)
  const [form, setForm] = useState<CreateUserMembershipDto>(defaultCreate)
  const [formError, setFormError] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [debouncedListSearch, setDebouncedListSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data: membershipsPage, isLoading, isFetching } = useQuery({
    queryKey: ['user-memberships-paged', page, pageSize, debouncedListSearch, statusFilter],
    queryFn: async () => {
      const { data } = await userMembershipsService.getPaged({
        page,
        pageSize,
        search: debouncedListSearch || undefined,
        status: statusFilter,
      })
      return data
    },
  })
  const memberships = membershipsPage?.items ?? []
  const totalMemberships = membershipsPage?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalMemberships / pageSize))

  const { data: users = [], isFetching: usersFetching } = useQuery({
    queryKey: ['users-paged-membership-modal', debouncedMemberSearch],
    enabled: modalOpen && !editing,
    queryFn: async () => {
      const { data } = await usersService.getPaged({
        page: 1,
        pageSize: 100,
        membersOnly: true,
        isActive: true,
        search: debouncedMemberSearch || undefined,
      })
      return Array.isArray(data?.items) ? data.items : []
    },
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedMemberSearch(memberSearch.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [memberSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedListSearch(listSearch.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [listSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedListSearch, statusFilter])

  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data } = await membershipPlansService.getAll()
      const list = Array.isArray(data) ? data : []
      return list.map((p: { id?: number; Id?: number; planName?: string; PlanName?: string; durationDays?: number; DurationDays?: number; price?: number; Price?: number }) => ({
        id: p.id ?? p.Id ?? 0,
        planName: p.planName ?? p.PlanName ?? '',
        durationDays: p.durationDays ?? p.DurationDays ?? 0,
        price: p.price ?? p.Price ?? 0,
      }))
    },
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserMembershipDto) => userMembershipsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-memberships'] })
      setModalOpen(false)
      setForm(defaultCreate)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to create membership'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateUserMembershipDto }) =>
      userMembershipsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-memberships'] })
      setEditing(null)
      setForm(defaultCreate)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to update membership'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userMembershipsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-memberships'] }),
  })

  const membershipStats = useMemo(() => {
    const total = memberships.length
    const active = memberships.filter((m) => m.status === 'Active').length
    const paused = memberships.filter((m) => m.status === 'Paused').length
    const expired = memberships.filter((m) => m.status === 'Expired').length
    return { total, active, paused, expired }
  }, [memberships])

  const openAdd = () => {
    setEditing(null)
    setForm({
      ...defaultCreate,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    })
    setFormError(null)
    setMemberSearch('')
    setDebouncedMemberSearch('')
    setModalOpen(true)
  }

  const openEdit = (m: UserMembership) => {
    setEditing(m)
    setForm({
      userId: m.userId,
      planId: m.planId,
      startDate: m.startDate.slice(0, 10),
      endDate: m.endDate.slice(0, 10),
      status: m.status,
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(defaultCreate)
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const userId = editing ? editing.userId : form.userId
    const planId = editing ? editing.planId : form.planId
    if (!editing && (userId === 0 || planId === 0)) {
      setFormError('Please select a member and a plan.')
      return
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        dto: {
          startDate: form.startDate,
          endDate: form.endDate,
          status: form.status,
        },
      })
    } else {
      createMutation.mutate({
        userId: form.userId,
        planId: form.planId,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      })
    }
  }

  const handleDelete = (m: UserMembership) => {
    if (!window.confirm('Delete this membership record?')) return
    deleteMutation.mutate(m.id)
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Memberships"
        titleGradient="user memberships"
        subtitle="Assign plans to members and track start dates, end dates, and status."
        primaryAction={{ label: '+ Add membership', onClick: openAdd }}
      >
        <DashboardMetricsGrid cols={4}>
          <MetricCard
            title="Total"
            value={membershipStats.total}
            gradient="from-blue-500 to-indigo-500"
            icon={membershipMetricIcons.total}
            caption="Membership records"
          />
          <MetricCard
            title="Active"
            value={membershipStats.active}
            gradient="from-emerald-400 to-teal-500"
            icon={membershipMetricIcons.active}
            caption="Currently valid"
          />
          <MetricCard
            title="Paused"
            value={membershipStats.paused}
            gradient="from-amber-400 to-orange-500"
            icon={membershipMetricIcons.paused}
            caption="On hold"
          />
          <MetricCard
            title="Expired"
            value={membershipStats.expired}
            gradient="from-slate-500 to-slate-700"
            icon={membershipMetricIcons.expired}
            caption="Past end date"
          />
        </DashboardMetricsGrid>

        <DashboardTablePanel
          title="Membership list"
          description="Each row links to the member profile when a name is available."
        >
          <div className="flex flex-col gap-2 border-b border-white/10 px-6 py-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input
                label=""
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search member or plan..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | MembershipStatus)}
              className={selectClass}
              aria-label="Filter memberships by status"
            >
              <option value="all" className="bg-slate-900">All status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s} className="bg-slate-900">{s}</option>
              ))}
            </select>
          </div>
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading…</p>
          ) : memberships.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No memberships yet. Add one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3 font-medium">Member</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Start</th>
                    <th className="px-6 py-3 font-medium">End</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m) => (
                    <tr key={m.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="px-6 py-3">
                        {m.userName ? (
                          <Link
                            to={`/dashboard/users/${m.userId}`}
                            className="font-medium text-blue-300 transition hover:text-blue-200"
                          >
                            {m.userName}
                          </Link>
                        ) : (
                          <span className="text-slate-300">User #{m.userId}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-300">{m.planName ?? `Plan #${m.planId}`}</td>
                      <td className="px-6 py-3 text-slate-300">{formatDate(m.startDate)}</td>
                      <td className="px-6 py-3 text-slate-300">{formatDate(m.endDate)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            m.status === 'Active'
                              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                              : m.status === 'Paused'
                                ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                                : 'bg-white/5 text-slate-400 ring-1 ring-white/10'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="text-sm text-blue-300 transition hover:text-blue-200 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(m)}
                            className="text-sm text-rose-300 transition hover:text-rose-200 hover:underline"
                          >
                            Delete
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-3">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · Showing {memberships.length} of {totalMemberships}
              {isFetching ? ' · Refreshing…' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit membership' : 'Add membership'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
              {formError}
            </p>
          )}
          {!editing && (
            <>
              <div>
                <label className={labelClass}>Member</label>
                <Input
                  label=""
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search member name, email, phone..."
                />
                {usersFetching ? (
                  <p className="mt-1 text-xs text-slate-500">Searching members…</p>
                ) : null}
                <select
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: Number(e.target.value) }))}
                  className={selectClass}
                  required
                >
                  <option value={0} className="bg-slate-900">
                    Select member
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900">
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Plan</label>
                <select
                  value={form.planId}
                  onChange={(e) => {
                    const planId = Number(e.target.value)
                    const plan = plans.find((p) => p.id === planId)
                    const start = form.startDate.slice(0, 10)
                    const end = plan && plan.durationDays > 0 ? addDays(start, plan.durationDays) : form.endDate.slice(0, 10)
                    setForm((f) => ({ ...f, planId, endDate: end }))
                  }}
                  className={selectClass}
                  required
                >
                  <option value={0} className="bg-slate-900">
                    Select plan
                  </option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">
                      {p.planName} — {p.durationDays} days, ₹{p.price}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <Input
            label="Start date"
            type="date"
            value={form.startDate.slice(0, 10)}
            onChange={(e) => {
              const start = e.target.value
              if (!editing && form.planId > 0) {
                const plan = plans.find((p) => p.id === form.planId)
                const end = plan && plan.durationDays > 0 ? addDays(start, plan.durationDays) : form.endDate.slice(0, 10)
                setForm((f) => ({ ...f, startDate: start, endDate: end }))
              } else {
                setForm((f) => ({ ...f, startDate: start }))
              }
            }}
            required
          />
          {!editing && form.planId > 0 ? (
            <div>
              <label className={labelClass}>End date</label>
              <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                {form.endDate.slice(0, 10)}{' '}
                <span className="text-xs text-slate-500">(from plan duration)</span>
              </p>
            </div>
          ) : (
            <Input
              label="End date"
              type="date"
              value={form.endDate.slice(0, 10)}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              required
            />
          )}
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as MembershipStatus }))
              }
              className={selectClass}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
