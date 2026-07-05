import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { DataPageSection } from '../components/layout/DataPageShell'
import { AddUserMembershipModal, type AddUserMembershipIntent } from '../components/memberships/AddUserMembershipModal'
import { RequestMembershipVoidModal } from '../components/memberships/RequestMembershipVoidModal'
import { RevertLastRenewalModal } from '../components/memberships/RevertLastRenewalModal'
import { RequestMembershipChangeModal } from '../components/memberships/RequestMembershipChangeModal'
import { ActiveMembershipConflictModal } from '../components/memberships/ActiveMembershipConflictModal'
import { MembershipBillingNav } from '../components/memberships/MembershipBillingNav'
import { UserMembershipsSummaryStrip } from '../components/memberships/UserMembershipsSummaryStrip'
import { UserMembershipsToolbar } from '../components/memberships/UserMembershipsToolbar'
import { UserMembershipsGrid } from '../components/memberships/UserMembershipsGrid'
import { EditUserMembershipModal } from '../components/memberships/EditUserMembershipModal'
import { UserMembershipDetailDrawer } from '../components/memberships/UserMembershipDetailDrawer'
import { UserMembershipRenewalFocusStrip } from '../components/memberships/UserMembershipRenewalFocusStrip'
import { HelpButton } from '../modules/help/components/HelpButton'
import { userMembershipsService } from '../services/userMemberships.service'
import { usersService } from '../services/users.service'
import { getApiErrorMessage } from '../lib/apiErrors'
import { downloadUserMembershipsCsv } from '../lib/userMembershipsCsv'
import {
  findOccupyingMembershipConflict,
  occupiesMembershipSlot,
} from '../lib/membershipRules'
import {
  conflictCollectPaymentPath,
  conflictNeedsCollectPayment,
  extendMembershipAccessRenewal,
} from '../lib/membershipRenewFlow'
import { renewStartDateForMembership } from '../lib/membershipFormUtils'
import {
  parseUserMembershipQuickFilter,
  type UserMembershipQuickFilter,
} from '../lib/userMembershipListUtils'
import {
  membershipToConflict,
  parseActiveMembershipConflict,
} from '../lib/activeMembershipConflict'
import type { ActiveMembershipConflict } from '../types/activeMembershipConflict'
import type {
  UserMembership,
  CreateUserMembershipDto,
  UpdateUserMembershipDto,
  MembershipStatus,
  ExpiringMembershipQueueItem,
} from '../types/userMembership'
import type { User } from '../types/user'

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

const MEMBERSHIPS_QUERY_KEY = ['user-memberships'] as const
const MEMBERSHIPS_PAGE_PATH = '/dashboard/user-memberships'

const defaultEditForm: CreateUserMembershipDto = {
  userId: 0,
  planId: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  status: 'Active',
}

const STATUS_FILTER_VALUES = new Set<string>([
  'all',
  'Active',
  'ActivePendingPayment',
  'PartialPayment',
  'Paused',
  'Expired',
  'VoidPending',
])

function parseStatusFilter(raw: string | null): 'all' | MembershipStatus {
  if (!raw || !STATUS_FILTER_VALUES.has(raw) || raw === 'all') return 'all'
  return raw as MembershipStatus
}

function parsePage(raw: string | null): number {
  const page = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function parseMembershipId(raw: string | null): number | null {
  const id = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

function buildPagedQueryParams(options: {
  quickFilter: UserMembershipQuickFilter
  statusFilter: 'all' | MembershipStatus
  membershipId: number | null
}) {
  const { quickFilter, statusFilter, membershipId } = options
  if (membershipId != null) {
    return { membershipId, includeTerminal: true as const }
  }

  switch (quickFilter) {
    case 'needsPayment':
      return { needsPayment: true as const }
    case 'expiring14':
      return { expiringWithinDays: 14 }
    case 'voidPending':
      return { status: 'VoidPending' as const }
    case 'expired':
      return { status: 'Expired' as const }
    case 'terminal':
      return { includeTerminal: true as const }
    default:
      return statusFilter === 'all' ? {} : { status: statusFilter }
  }
}

export function UserMembershipsPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const listSearch = searchParams.get('search') ?? ''
  const statusFilter = parseStatusFilter(searchParams.get('status'))
  const quickFilter = parseUserMembershipQuickFilter(searchParams.get('quick'))
  const highlightMembershipId = parseMembershipId(searchParams.get('membershipId'))
  const page = parsePage(searchParams.get('page'))
  const [pageSize, setPageSize] = useState(50)
  const [debouncedListSearch, setDebouncedListSearch] = useState(listSearch.trim())

  const pagedFilters = useMemo(
    () =>
      buildPagedQueryParams({
        quickFilter,
        statusFilter,
        membershipId: highlightMembershipId,
      }),
    [quickFilter, statusFilter, highlightMembershipId],
  )

  const filteredView =
    Boolean(debouncedListSearch.trim()) ||
    quickFilter !== 'all' ||
    statusFilter !== 'all' ||
    highlightMembershipId != null

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addIntent, setAddIntent] = useState<AddUserMembershipIntent>('create')
  const [addPrefill, setAddPrefill] = useState<{
    planId?: number
    startDate?: string
    priorMembershipId?: number
  }>()
  const [addLockedMember, setAddLockedMember] = useState<User | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<UserMembership | null>(null)
  const [revertTarget, setRevertTarget] = useState<UserMembership | null>(null)
  const [activeConflict, setActiveConflict] = useState<ActiveMembershipConflict | null>(null)
  const [editing, setEditing] = useState<UserMembership | null>(null)
  const [form, setForm] = useState<CreateUserMembershipDto>(defaultEditForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [openingRenewUserId, setOpeningRenewUserId] = useState<number | null>(null)
  const [detailMembership, setDetailMembership] = useState<UserMembership | null>(null)
  const [changeRequestOpen, setChangeRequestOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const updateSearchParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === '') next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedListSearch(listSearch.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [listSearch])

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: [...MEMBERSHIPS_QUERY_KEY, 'summary'],
    queryFn: () => userMembershipsService.getSummary(),
    staleTime: 30_000,
  })

  const { data: membershipsPage, isLoading, isFetching } = useQuery({
    queryKey: [
      ...MEMBERSHIPS_QUERY_KEY,
      'paged',
      page,
      pageSize,
      debouncedListSearch,
      quickFilter,
      statusFilter,
      highlightMembershipId,
      pagedFilters,
    ],
    queryFn: () =>
      userMembershipsService.getPaged({
        page,
        pageSize,
        search: debouncedListSearch || undefined,
        ...pagedFilters,
      }),
  })

  const memberships = membershipsPage?.items ?? []
  const totalMemberships = membershipsPage?.totalCount ?? 0

  useEffect(() => {
    if (!highlightMembershipId) return
    const row = memberships.find((m) => m.id === highlightMembershipId)
    if (row) setDetailMembership(row)
  }, [highlightMembershipId, memberships])

  const openDetail = useCallback(
    (membership: UserMembership) => {
      setDetailMembership(membership)
      updateSearchParams({ membershipId: String(membership.id), page: null })
    },
    [updateSearchParams],
  )

  const closeDetail = useCallback(() => {
    setDetailMembership(null)
    updateSearchParams({ membershipId: null })
  }, [updateSearchParams])

  const emptyMessage = useMemo(() => {
    if (highlightMembershipId != null && !debouncedListSearch.trim()) {
      return `Membership #${highlightMembershipId} was not found in the current filter.`
    }
    if (debouncedListSearch.trim()) {
      return 'No memberships match your search. Try another name, plan, or membership ID.'
    }
    if (quickFilter === 'needsPayment') {
      return 'No memberships need payment right now.'
    }
    if (quickFilter === 'expiring14') {
      return 'No memberships are expiring within the next 14 days.'
    }
    if (quickFilter !== 'all' || statusFilter !== 'all') {
      return 'No memberships in this filter. Try another view or add a new membership.'
    }
    return 'No memberships yet. Add one to assign a plan to a member.'
  }, [debouncedListSearch, quickFilter, statusFilter, highlightMembershipId])

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateUserMembershipDto }) =>
      userMembershipsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...MEMBERSHIPS_QUERY_KEY, 'summary'] })
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

  const openAdd = () => {
    setAddIntent('create')
    setAddPrefill(undefined)
    setAddLockedMember(null)
    setAddModalOpen(true)
  }

  const closeAddModal = () => {
    setAddModalOpen(false)
    setAddIntent('create')
    setAddPrefill(undefined)
    setAddLockedMember(null)
  }

  const openEdit = useCallback((m: UserMembership) => {
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
  }, [])

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

  const handleRenewActive = async (conflict: ActiveMembershipConflict) => {
    setActiveConflict(null)

    if (conflictNeedsCollectPayment(conflict)) {
      navigate(conflictCollectPaymentPath(conflict, MEMBERSHIPS_PAGE_PATH))
      return
    }

    const result = await extendMembershipAccessRenewal(conflict)
    if (result.ok) {
      toast.success(`Membership extended until ${new Date(result.endDate + 'T12:00:00').toLocaleDateString()}.`)
      void queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: [...MEMBERSHIPS_QUERY_KEY, 'summary'] })
      return
    }

    if (result.reason === 'needs_collect') {
      navigate(conflictCollectPaymentPath(conflict, MEMBERSHIPS_PAGE_PATH))
      return
    }

    toast.error(result.message ?? 'Could not extend membership.')
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

  const handleRequestVoid = useCallback((m: UserMembership) => {
    if (m.status === 'Voided' || m.status === 'Transferred') {
      toast.error('This membership is already voided or transferred.')
      return
    }
    setVoidTarget(m)
  }, [])

  const handleRenewMembership = useCallback(async (m: UserMembership) => {
    if (openingRenewUserId != null) return
    setOpeningRenewUserId(m.userId)
    try {
      const { data: user } = await usersService.getById(m.userId)
      setAddLockedMember(user)
      setAddIntent('renew')
      setAddPrefill({
        planId: m.planId,
        startDate: renewStartDateForMembership(m),
        priorMembershipId: m.id,
      })
      setAddModalOpen(true)
    } catch {
      toast.error('Could not load member for renewal.')
    } finally {
      setOpeningRenewUserId(null)
    }
  }, [openingRenewUserId])

  const handleRenewQueueItem = useCallback(
    async (item: ExpiringMembershipQueueItem) => {
      await handleRenewMembership({
        id: item.id,
        userId: item.userId,
        planId: item.planId,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
        userName: item.userName,
        planName: item.planName,
      })
    },
    [handleRenewMembership],
  )

  const handleExportCsv = useCallback(async () => {
    setExporting(true)
    try {
      const exportPage = await userMembershipsService.getPaged({
        page: 1,
        pageSize: Math.min(Math.max(totalMemberships, memberships.length), 500),
        search: debouncedListSearch || undefined,
        ...pagedFilters,
      })
      if (exportPage.items.length === 0) {
        toast.error('Nothing to export for the current filter.')
        return
      }
      downloadUserMembershipsCsv(exportPage.items)
      toast.success(`Exported ${exportPage.items.length} row(s)`)
    } catch {
      toast.error('Export failed.')
    } finally {
      setExporting(false)
    }
  }, [debouncedListSearch, memberships.length, pagedFilters, totalMemberships])

  const handleOpenExpiringFilter = () => {
    updateSearchParams({ quick: 'expiring14', status: null, page: null, membershipId: null })
  }

  const handleSearchChange = (value: string) => {
    updateSearchParams({ search: value.trim() || null, page: null, membershipId: null })
  }

  const handleStatusFilterChange = (value: 'all' | MembershipStatus) => {
    updateSearchParams({
      status: value === 'all' ? null : value,
      quick: null,
      page: null,
      membershipId: null,
    })
  }

  const handleQuickFilterChange = (value: UserMembershipQuickFilter) => {
    updateSearchParams({
      quick: value === 'all' ? null : value,
      status: null,
      page: null,
      membershipId: null,
    })
  }

  const handlePageChange = (nextPage: number) => {
    updateSearchParams({ page: nextPage <= 1 ? null : String(nextPage) })
  }

  const handleClearMembershipFocus = () => {
    setDetailMembership(null)
    updateSearchParams({ membershipId: null, page: null })
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Memberships"
        titleGradient="member plans"
        subtitle="Assign plans, collect payment, renew access, and request lifecycle changes."
        primaryAction={{ label: '+ Add membership', onClick: openAdd }}
        showExport={false}
        lockViewport={false}
      >
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <HelpButton moduleKey="user_memberships" size="sm" />
          <button
            type="button"
            disabled={exporting || isLoading}
            onClick={() => void handleExportCsv()}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>

        <MembershipBillingNav />

        <DataPageSection>
          <UserMembershipsSummaryStrip
            summary={summary}
            matchingCount={totalMemberships}
            isLoading={summaryLoading || isLoading}
            filteredView={filteredView}
            quickFilter={quickFilter}
            onQuickFilterChange={handleQuickFilterChange}
          />
        </DataPageSection>

        <DataPageSection>
          <UserMembershipRenewalFocusStrip
            returnTo={MEMBERSHIPS_PAGE_PATH}
            onOpenExpiringFilter={handleOpenExpiringFilter}
            onRenewItem={(item) => void handleRenewQueueItem(item)}
          />
        </DataPageSection>

        {highlightMembershipId != null ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-100">
              Showing membership <span className="font-mono font-semibold">#{highlightMembershipId}</span>
            </p>
            <button
              type="button"
              onClick={handleClearMembershipFocus}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              Clear focus
            </button>
          </div>
        ) : null}

        <DashboardTablePanel
          title="Membership list"
          description="Timeline and payment columns reflect billing status. Member names open membership history."
          pageScroll
          toolbar={
            <UserMembershipsToolbar
              listSearch={listSearch}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              quickFilter={quickFilter}
              onQuickFilterChange={handleQuickFilterChange}
            />
          }
        >
          <UserMembershipsGrid
            memberships={memberships}
            loading={isLoading}
            isFetching={isFetching}
            page={page}
            pageSize={pageSize}
            totalCount={totalMemberships}
            emptyMessage={emptyMessage}
            returnTo={MEMBERSHIPS_PAGE_PATH}
            highlightMembershipId={highlightMembershipId}
            onOpenDetail={openDetail}
            onPageChange={handlePageChange}
            onPageSizeChange={setPageSize}
            onEdit={openEdit}
            onRequestVoid={handleRequestVoid}
            onRenew={handleRenewMembership}
            pageScroll
          />
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <AddUserMembershipModal
        open={addModalOpen}
        onClose={closeAddModal}
        lockedMember={addLockedMember}
        intent={addIntent}
        prefill={addPrefill}
        creationSource="user_memberships_page"
        extraInvalidateQueryKeys={[[...MEMBERSHIPS_QUERY_KEY, 'paged']]}
        onCreated={() => updateSearchParams({ page: null })}
      />

      <EditUserMembershipModal
        open={editModalOpen}
        editing={editing}
        form={form}
        formError={formError}
        isPending={updateMutation.isPending}
        onClose={closeEditModal}
        onSubmit={handleSubmit}
        onRequestApproval={() => setChangeRequestOpen(true)}
        onFormChange={setForm}
      />

      <RequestMembershipChangeModal
        open={changeRequestOpen}
        membership={editing}
        form={form}
        onClose={() => setChangeRequestOpen(false)}
        onSubmitted={() => {
          setChangeRequestOpen(false)
          closeEditModal()
          void queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
          void queryClient.invalidateQueries({ queryKey: [...MEMBERSHIPS_QUERY_KEY, 'summary'] })
          void queryClient.invalidateQueries({ queryKey: ['membership-approval-requests'] })
        }}
      />

      <UserMembershipDetailDrawer
        membership={detailMembership}
        open={detailMembership != null}
        returnTo={MEMBERSHIPS_PAGE_PATH}
        onClose={closeDetail}
        onEdit={(m) => {
          closeDetail()
          openEdit(m)
        }}
        onRenew={handleRenewMembership}
        onRequestVoid={handleRequestVoid}
        onRevertLastRenewal={setRevertTarget}
      />

      <RevertLastRenewalModal
        open={revertTarget != null}
        membership={revertTarget}
        onClose={() => setRevertTarget(null)}
        onReverted={() => {
          void queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
          void queryClient.invalidateQueries({ queryKey: [...MEMBERSHIPS_QUERY_KEY, 'summary'] })
          void queryClient.invalidateQueries({ queryKey: ['membership-audit'] })
          void queryClient.invalidateQueries({ queryKey: ['membership-revert-preview'] })
        }}
      />

      <RequestMembershipVoidModal
        open={voidTarget != null}
        membership={voidTarget}
        onClose={() => setVoidTarget(null)}
        onSubmitted={() => {
          queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY })
          queryClient.invalidateQueries({ queryKey: [...MEMBERSHIPS_QUERY_KEY, 'summary'] })
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
