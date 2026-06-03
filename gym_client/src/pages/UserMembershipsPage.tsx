import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { DataPageSection } from '../components/layout/DataPageShell'
import { MembershipStatusBadge } from '../components/billing/MembershipStatusBadge'
import { RequestMembershipVoidModal } from '../components/memberships/RequestMembershipVoidModal'
import {
  DataFilterSelect,
  DataToolbar,
  EnterpriseDataGrid,
  RowActionsMenu,
  type DataGridColumnDef,
} from '../components/data-grid'
import { DashboardMetricsGrid } from '../components/layout/DashboardMetricsGrid'
import { MetricCard } from '../components/dashboard/MetricCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { userMembershipsService } from '../services/userMemberships.service'
import { usersService } from '../services/users.service'
import { membershipPlansService } from '../services/membershipPlans.service'
import { getApiErrorMessage } from '../lib/apiErrors'
import {
  findOccupyingMembershipConflict,
  occupiesMembershipSlot,
} from '../lib/membershipRules'
import {
  getMembershipCollectPaymentPath,
  membershipStatusClickTitle,
} from '../lib/membershipPaymentNavigation'
import {
  membershipToConflict,
  parseActiveMembershipConflict,
} from '../lib/activeMembershipConflict'
import { ActiveMembershipConflictModal } from '../components/memberships/ActiveMembershipConflictModal'
import type { ActiveMembershipConflict } from '../types/activeMembershipConflict'
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

const statusOptions: MembershipStatus[] = [
  'Active',
  'ActivePendingPayment',
  'PartialPayment',
  'Paused',
  'Expired',
]

const statusLabel: Partial<Record<MembershipStatus, string>> = {
  Active: 'Active',
  ActivePendingPayment: 'Active (Pending Payment)',
  PartialPayment: 'Partial Payment',
  Paused: 'Paused',
  Expired: 'Expired',
  Frozen: 'Frozen',
  Cancelled: 'Cancelled',
  Pending: 'Pending',
  VoidPending: 'Void pending',
  Voided: 'Voided',
  Transferred: 'Transferred',
}

/** Add days to a date string (YYYY-MM-DD), return YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) return dateStr
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Shared prefix so create/update/delete invalidate the paged list too. */
const MEMBERSHIPS_QUERY_KEY = ['user-memberships'] as const

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<UserMembership | null>(null)
  const [activeConflict, setActiveConflict] = useState<ActiveMembershipConflict | null>(null)
  const [editing, setEditing] = useState<UserMembership | null>(null)
  const [form, setForm] = useState<CreateUserMembershipDto>(defaultCreate)
  const [formError, setFormError] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('')
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [debouncedListSearch, setDebouncedListSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const memberDropdownRef = useRef<HTMLDivElement>(null)

  const { data: membershipsPage, isLoading, isFetching } = useQuery({
    queryKey: [...MEMBERSHIPS_QUERY_KEY, 'paged', page, pageSize, debouncedListSearch, statusFilter],
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
    if (!memberDropdownOpen) return
    const onDocClick = (event: MouseEvent) => {
      if (!memberDropdownRef.current?.contains(event.target as Node)) {
        setMemberDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [memberDropdownOpen])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedListSearch(listSearch.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [listSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedListSearch, statusFilter])

  const { data: existingActiveConflict } = useQuery({
    queryKey: ['active-membership-conflict', form.userId],
    queryFn: async () => {
      const res = await userMembershipsService.getActiveConflict(form.userId)
      if (res.status === 200 && res.data) return res.data
      const { data: rows } = await userMembershipsService.getByUserId(form.userId)
      const occupying = Array.isArray(rows)
        ? findOccupyingMembershipConflict(rows, form.userId)
        : undefined
      return occupying ? membershipToConflict(occupying) : null
    },
    enabled: modalOpen && !editing && form.userId > 0,
  })

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
      queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
      setModalOpen(false)
      setForm(defaultCreate)
      setFormError(null)
    },
    onError: (err: unknown) => {
      const conflict = parseActiveMembershipConflict(err)
      if (conflict?.membershipId) {
        setActiveConflict(conflict)
        setModalOpen(false)
        return
      }
      setFormError(getApiErrorMessage(err, 'Failed to create membership'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateUserMembershipDto }) =>
      userMembershipsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
      setModalOpen(false)
      setEditing(null)
      setForm(defaultCreate)
      setFormError(null)
    },
    onError: (err: unknown) => {
      const conflict = parseActiveMembershipConflict(err)
      if (conflict?.membershipId) {
        setActiveConflict(conflict)
        setModalOpen(false)
        return
      }
      setFormError(getApiErrorMessage(err, 'Failed to update membership'))
    },
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
    setMemberDropdownOpen(false)
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
    setMemberDropdownOpen(false)
  }

  const showActiveConflict = (conflict: ActiveMembershipConflict) => {
    setActiveConflict(conflict)
    setModalOpen(false)
  }

  const handleRenewActive = (conflict: ActiveMembershipConflict) => {
    setActiveConflict(null)
    navigate(
      `/dashboard/payments/collect?membershipId=${conflict.membershipId}&userId=${conflict.userId}`,
    )
  }

  const handleUpgradeActive = (conflict: ActiveMembershipConflict) => {
    setActiveConflict(null)
    const row = memberships.find((m) => m.id === conflict.membershipId)
    if (row) {
      openEdit(row)
      return
    }
    void userMembershipsService.getById(conflict.membershipId).then(({ data }) => {
      if (data) openEdit(data)
      else toast.error('Could not load membership for upgrade.')
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const userId = editing ? editing.userId : form.userId
    const planId = editing ? editing.planId : form.planId
    if (!editing && (userId === 0 || planId === 0)) {
      setFormError('Please select a member and a plan.')
      return
    }
    if (!editing) {
      const localRow = findOccupyingMembershipConflict(memberships, userId)
      if (localRow) {
        showActiveConflict(membershipToConflict(localRow))
        return
      }
      try {
        const { status, data } = await userMembershipsService.getActiveConflict(userId)
        if (status === 200 && data) {
          showActiveConflict(data)
          return
        }
      } catch {
        /* server enforces on POST */
      }
    } else {
      const targetStatus = form.status ?? editing.status
      if (occupiesMembershipSlot(targetStatus)) {
        const localRow = findOccupyingMembershipConflict(memberships, userId, editing.id)
        if (localRow) {
          showActiveConflict(membershipToConflict(localRow))
          return
        }
      }
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
        status: form.status ?? 'Active',
      })
    }
  }

  const handleRequestVoid = (m: UserMembership) => {
    if (m.status === 'Voided' || m.status === 'Transferred') {
      toast.error('This membership is already voided or transferred.')
      return
    }
    setVoidTarget(m)
  }

  const membershipStatusAction = (m: UserMembership) => {
    const collectPath = getMembershipCollectPaymentPath(m)
    if (collectPath) return () => navigate(collectPath)
    if (m.status === 'Paused') return () => openEdit(m)
    return () => navigate(`/dashboard/users/${m.userId}`)
  }

  const membershipStatusTitle = (status: MembershipStatus) => {
    const collectTitle = membershipStatusClickTitle(status)
    if (collectTitle) return collectTitle
    if (status === 'Paused') return 'Edit membership'
    return 'Open member profile'
  }

  const membershipColumns = useMemo<DataGridColumnDef<UserMembership>[]>(
    () => [
      {
        id: 'member',
        header: 'Member',
        sticky: true,
        minWidth: 180,
        width: 200,
        sortable: true,
        accessorFn: (m) => m.userName ?? `User #${m.userId}`,
        cell: ({ row }) =>
          row.userName ? (
            <Link
              to={`/dashboard/users/${row.userId}`}
              className="truncate font-medium text-blue-300 hover:text-blue-200"
            >
              {row.userName}
            </Link>
          ) : (
            <span className="text-slate-300">User #{row.userId}</span>
          ),
      },
      {
        id: 'plan',
        header: 'Plan',
        minWidth: 140,
        width: 160,
        sortable: true,
        accessorFn: (m) => m.planName ?? `Plan #${m.planId}`,
      },
      {
        id: 'start',
        header: 'Start',
        minWidth: 110,
        width: 120,
        sortable: true,
        accessorFn: (m) => m.startDate,
        cell: ({ row }) => formatDate(row.startDate),
      },
      {
        id: 'end',
        header: 'End',
        minWidth: 110,
        width: 120,
        hideBelow: 'md',
        accessorFn: (m) => m.endDate,
        cell: ({ row }) => formatDate(row.endDate),
      },
      {
        id: 'status',
        header: 'Status',
        minWidth: 150,
        width: 160,
        sortable: true,
        accessorFn: (m) => m.status,
        cell: ({ row }) => (
          <MembershipStatusBadge
            status={row.status}
            onClick={membershipStatusAction(row)}
            title={membershipStatusTitle(row.status)}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        width: 72,
        minWidth: 72,
        align: 'right',
        cell: ({ row }) => (
          <RowActionsMenu
            row={row}
            actions={[
              { id: 'edit', label: 'Edit', onClick: openEdit },
              ...(row.status !== 'Voided' && row.status !== 'Transferred'
                ? [
                    {
                      id: 'void',
                      label: 'Request void',
                      variant: 'danger' as const,
                      onClick: handleRequestVoid,
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    [navigate, openEdit, handleRequestVoid],
  )

  const selectedMember = users.find((u) => u.id === form.userId)

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Memberships"
        titleGradient="user memberships"
        subtitle="Assign plans to members and track start dates, end dates, and status."
        primaryAction={{ label: '+ Add membership', onClick: openAdd }}
      >
        <DataPageSection>
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
        </DataPageSection>

        <DashboardTablePanel
          title="Membership list"
          description="Click status badges for payment or profile actions."
          toolbar={
            <DataToolbar
              searchValue={listSearch}
              onSearchChange={setListSearch}
              searchPlaceholder="Search member or plan…"
              searchAriaLabel="Search memberships"
              filters={
                <DataFilterSelect
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as 'all' | MembershipStatus)}
                  ariaLabel="Filter by status"
                  options={[
                    { value: 'all', label: 'Operational (hide voided)' },
                    ...statusOptions.map((s) => ({ value: s, label: statusLabel[s] })),
                  ]}
                />
              }
            />
          }
        >
          <EnterpriseDataGrid
            data={memberships}
            columns={membershipColumns}
            getRowId={(m) => m.id}
            loading={isLoading}
            emptyMessage="No memberships yet. Add one to get started."
            pagination={
              totalMemberships > 0
                ? {
                    page,
                    pageSize,
                    totalCount: totalMemberships,
                    isFetching,
                    pageSizeOptions: [25, 50, 100],
                    onPageChange: setPage,
                    onPageSizeChange: (size) => {
                      setPageSize(size)
                      setPage(1)
                    },
                  }
                : undefined
            }
          />
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
          {!editing && existingActiveConflict ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              <p className="font-medium">Member already has an active membership.</p>
              <p className="mt-1 text-amber-200/90">
                {existingActiveConflict.planName ?? 'Plan'} · ends{' '}
                {formatDate(existingActiveConflict.endDate)} · {existingActiveConflict.remainingDays}{' '}
                days left
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => showActiveConflict(existingActiveConflict)}
                >
                  View options
                </Button>
              </div>
            </div>
          ) : null}
          {!editing && (
            <>
              <div ref={memberDropdownRef} className="relative">
                <label className={labelClass}>Member</label>
                <button
                  type="button"
                  onClick={() => setMemberDropdownOpen((v) => !v)}
                  className={`${selectClass} flex items-center justify-between`}
                  aria-haspopup="listbox"
                  aria-label="Select member"
                >
                  <span className="truncate text-left">
                    {selectedMember
                      ? `${selectedMember.firstName} ${selectedMember.lastName} (${selectedMember.email})`
                      : form.userId > 0
                        ? `User #${form.userId}`
                        : 'Select member'}
                  </span>
                  <span className="ml-2 text-slate-400">▾</span>
                </button>
                {memberDropdownOpen ? (
                  <div
                    className="absolute z-50 mt-1 w-full rounded-xl border border-white/12 bg-slate-950/95 p-2 shadow-2xl shadow-blue-950/40 backdrop-blur-xl"
                    role="listbox"
                    aria-label="Member options"
                  >
                    <Input
                      label="Search member"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search member name, email, phone..."
                    />
                    {usersFetching ? (
                      <p className="mt-2 px-2 text-xs text-slate-500">Searching members…</p>
                    ) : users.length === 0 ? (
                      <p className="mt-2 px-2 text-xs text-slate-500">No members found.</p>
                    ) : (
                      <div className="mt-2 max-h-56 overflow-auto">
                        {users.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            role="option"
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                              form.userId === u.id
                                ? 'bg-blue-500/20 text-blue-100'
                                : 'text-slate-200 hover:bg-white/10'
                            }`}
                            onClick={() => {
                              setForm((f) => ({ ...f, userId: u.id }))
                              setMemberDropdownOpen(false)
                            }}
                          >
                            {u.firstName} {u.lastName} ({u.email})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
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
                  aria-label="Select plan"
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
              aria-label="Select membership status"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {statusLabel[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                (!editing && !!existingActiveConflict)
              }
            >
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <RequestMembershipVoidModal
        open={voidTarget != null}
        membership={voidTarget}
        onClose={() => setVoidTarget(null)}
        onSubmitted={() => {
          queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
          queryClient.invalidateQueries({ queryKey: ['membership-approval-requests'] })
        }}
      />

      <ActiveMembershipConflictModal
        open={activeConflict != null}
        conflict={activeConflict}
        onClose={() => setActiveConflict(null)}
        onRenew={handleRenewActive}
        onUpgrade={handleUpgradeActive}
      />
    </DashboardLayout>
  )
}
