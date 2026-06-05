import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { DataPageSection } from '../components/layout/DataPageShell'
import { MembershipStatusBadge } from '../components/billing/MembershipStatusBadge'
import { AddUserMembershipModal } from '../components/memberships/AddUserMembershipModal'
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
import {
  membershipFormLabelClass,
  membershipFormSelectClass,
  membershipStatusLabel,
  membershipStatusOptions,
} from '../lib/membershipFormUtils'
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

/** Shared prefix so create/update/delete invalidate the paged list too. */
const MEMBERSHIPS_QUERY_KEY = ['user-memberships'] as const

const defaultEditForm: CreateUserMembershipDto = {
  userId: 0,
  planId: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  status: 'Active',
}

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
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<UserMembership | null>(null)
  const [activeConflict, setActiveConflict] = useState<ActiveMembershipConflict | null>(null)
  const [editing, setEditing] = useState<UserMembership | null>(null)
  const [form, setForm] = useState<CreateUserMembershipDto>(defaultEditForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [listSearch, setListSearch] = useState('')
  const [debouncedListSearch, setDebouncedListSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedListSearch(listSearch.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [listSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedListSearch, statusFilter])

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateUserMembershipDto }) =>
      userMembershipsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
      setEditModalOpen(false)
      setEditing(null)
      setForm(defaultEditForm)
      setFormError(null)
    },
    onError: (err: unknown) => {
      const conflict = parseActiveMembershipConflict(err)
      if (conflict?.membershipId) {
        setActiveConflict(conflict)
        setEditModalOpen(false)
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
    setAddModalOpen(true)
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
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditing(null)
    setForm(defaultEditForm)
    setFormError(null)
  }

  const showActiveConflict = (conflict: ActiveMembershipConflict) => {
    setActiveConflict(conflict)
    setEditModalOpen(false)
    setAddModalOpen(false)
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
    if (!editing) return
    setFormError(null)
    const userId = editing.userId
    const targetStatus = form.status ?? editing.status
    if (occupiesMembershipSlot(targetStatus)) {
      const localRow = findOccupyingMembershipConflict(memberships, userId, editing.id)
      if (localRow) {
        showActiveConflict(membershipToConflict(localRow))
        return
      }
    }
    updateMutation.mutate({
      id: editing.id,
      dto: {
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      },
    })
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
                    ...statusOptions.map((s) => ({ value: s, label: membershipStatusLabel[s] ?? s })),
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

      <AddUserMembershipModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        creationSource="user_memberships_page"
        extraInvalidateQueryKeys={[[...MEMBERSHIPS_QUERY_KEY, 'paged']]}
        onCreated={() => {
          setPage(1)
        }}
      />

      <Modal open={editModalOpen && editing != null} onClose={closeEditModal} title="Edit membership">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError ? (
            <p
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          <Input
            label="Start date"
            type="date"
            value={form.startDate.slice(0, 10)}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            required
          />
          <Input
            label="End date"
            type="date"
            value={form.endDate.slice(0, 10)}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            required
          />
          <div>
            <label className={membershipFormLabelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as MembershipStatus }))
              }
              className={membershipFormSelectClass}
              aria-label="Select membership status"
            >
              {membershipStatusOptions.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {membershipStatusLabel[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} isLoading={updateMutation.isPending}>
              Update
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
