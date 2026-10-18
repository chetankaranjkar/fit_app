import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceStrict } from 'date-fns'
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Clock,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  DashboardSubpageShell,
  DashboardTablePanel,
} from '../components/layout/DashboardSubpageShell'
import {
  EnterpriseDataGrid,
  RowActionsMenu,
  StatusBadge,
  type DataGridColumnDef,
} from '../components/data-grid'
import { Button } from '../components/ui/Button'
import { useBranchScope } from '../features/branch/BranchScopeContext'
import { BranchChoiceField } from '../features/branch/BranchChoiceField'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { usePermission } from '../features/auth/hooks/usePermission'
import { NavPermission } from '../features/auth/navPermissions'
import { getApiErrorMessage } from '../lib/apiErrors'
import {
  attendanceOverviewCopy,
  calendarDateFromApi,
  formatGymDay,
  gymCalendarDate,
  sessionCompletionPercent,
  shiftGymCalendarDate,
} from '../lib/attendanceOverview'
import { attendanceService } from '../services/attendance.service'
import { usersService } from '../services/users.service'
import type { AttendanceLogDto } from '../types/attendance'
import type { User } from '../types/user'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string; id?: number }
    return {
      userName: user?.fullName?.trim() || user?.username?.trim() || 'User',
      userId: typeof user?.id === 'number' ? user.id : 0,
    }
  } catch {
    return { userName: 'User', userId: 0 }
  }
}

const selectClass =
  'w-full rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 py-2 text-sm text-[var(--dashboard-text)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30'

const panelClass =
  'rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)]'

const fieldLabelClass = 'mb-1.5 block text-xs font-medium text-[var(--dashboard-muted)]'

const noteClass =
  'w-full rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 py-2 text-sm text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-muted)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30'

function isoToday() {
  return gymCalendarDate(new Date())
}

function isoDaysAgo(days: number) {
  return shiftGymCalendarDate(isoToday(), -days)
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function safeDuration(log: AttendanceLogDto) {
  if (typeof log.durationMinutes === 'number' && log.durationMinutes > 0) {
    return `${log.durationMinutes} min`
  }
  if (log.checkOutTime && log.checkInTime) {
    return formatDistanceStrict(new Date(log.checkInTime), new Date(log.checkOutTime))
  }
  return 'In progress'
}

function memberInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

type HistoryMember = { id: number; displayName: string }

function memberLabel(user: Pick<User, 'firstName' | 'lastName' | 'id'>) {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || `Member #${user.id}`
}

const MEMBER_PICKER_PAGE_SIZE = 20

function AttendanceMemberPicker({
  selectedUserId,
  onSelect,
}: {
  selectedUserId: number
  onSelect: (userId: number) => void
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const membersQuery = useQuery({
    queryKey: ['attendance-member-picker', debouncedSearch, page, MEMBER_PICKER_PAGE_SIZE],
    queryFn: async () => {
      const { data } = await usersService.getPaged({
        page,
        pageSize: MEMBER_PICKER_PAGE_SIZE,
        search: debouncedSearch || undefined,
        membersOnly: true,
        isActive: true,
        includeBilling: false,
      })
      return data
    },
  })

  const members = membersQuery.data?.items ?? []
  const totalCount = membersQuery.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / MEMBER_PICKER_PAGE_SIZE))
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * MEMBER_PICKER_PAGE_SIZE + 1
  const rangeEnd = Math.min(page * MEMBER_PICKER_PAGE_SIZE, totalCount)

  return (
    <div className="space-y-2">
      <Input
        label="Search members"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(1)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
        placeholder="Name, email, or phone"
        aria-label="Search members to check in"
      />
      <p className="text-xs text-[var(--dashboard-muted)]" aria-live="polite">
        {selectedUserId > 0
          ? `Selected: ${selectedLabel ?? `Member #${selectedUserId}`}`
          : 'Choose a member from the directory.'}
      </p>
      {membersQuery.isPending ? (
        <p className={`${panelClass} px-3 py-4 text-center text-sm text-[var(--dashboard-muted)]`} aria-busy="true">
          Searching members…
        </p>
      ) : membersQuery.isError ? (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-3 text-sm text-[var(--dashboard-text)]">
          <p>{getApiErrorMessage(membersQuery.error, 'Could not load members.')}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => void membersQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : members.length === 0 ? (
        <p className={`${panelClass} border-dashed px-3 py-4 text-center text-sm text-[var(--dashboard-muted)]`}>
          No members found.
        </p>
      ) : (
        <div
          className={`${panelClass} max-h-56 space-y-1 overflow-y-auto p-1`}
          role="listbox"
          aria-label="Members"
        >
          {members.map((member) => {
            const label = memberLabel(member)
            const selected = selectedUserId === member.id
            return (
              <button
                key={member.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setSelectedLabel(label)
                  onSelect(member.id)
                }}
                  className={[
                  'w-full rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  selected
                    ? 'bg-blue-500/15 text-[var(--dashboard-text)] ring-1 ring-blue-500/40'
                    : 'text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]',
                ].join(' ')}
              >
                <span className="font-semibold">{label}</span>
                {member.email ? (
                      <span className="mt-0.5 block truncate text-xs text-[var(--dashboard-muted)]">{member.email}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
      {membersQuery.isSuccess && totalCount > MEMBER_PICKER_PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--dashboard-muted)]">
          <span>
            {rangeStart}–{rangeEnd} of {totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1 || membersQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || membersQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AttendancePage() {
  const { userName, userId } = getDashboardUser()
  const canManageAttendance = usePermission(NavPermission.manageAttendance)
  const queryClient = useQueryClient()
  const todayIso = isoToday()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'checked-in' | 'checked-out' | 'late'
  >('all')
  const [startDate, setStartDate] = useState(() => isoDaysAgo(6))
  const [endDate, setEndDate] = useState(isoToday)
  const [anomalyDate, setAnomalyDate] = useState(isoToday)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInUserId, setCheckInUserId] = useState(0)
  const [checkInMethod, setCheckInMethod] = useState('FrontDesk')
  const [checkInNotes, setCheckInNotes] = useState('')
  const [checkInBranchId, setCheckInBranchId] = useState<number | undefined>()
  const branchScope = useBranchScope()
  const setVisitBranch = useCallback((branchId: number | undefined) => {
    setCheckInBranchId((current) => (current === branchId ? current : branchId))
  }, [])
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [selectedCheckout, setSelectedCheckout] = useState<AttendanceLogDto | null>(null)
  const [selectedMember, setSelectedMember] = useState<HistoryMember | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const attendanceQuery = useQuery({
    queryKey: ['attendance-paged', page, pageSize, startDate, endDate, debouncedSearch, statusFilter],
    queryFn: async () =>
      (
        await attendanceService.getPaged({
          page,
          pageSize,
          search: debouncedSearch || undefined,
          fromDate: startDate,
          toDate: endDate,
          sortBy: 'checkin',
          sortDir: 'desc',
          status: statusFilter === 'all' ? undefined : statusFilter,
        })
      ).data,
  })

  const summaryQuery = useQuery({
    queryKey: ['attendance-summary', startDate, endDate],
    queryFn: async () =>
      (
        await attendanceService.getSummary({
          fromDate: startDate,
          toDate: endDate,
        })
      ).data,
  })

  const attendanceLogs = attendanceQuery.data?.data ?? []
  const totalLogs = attendanceQuery.data?.totalRecords ?? 0
  const summary = summaryQuery.data
  const overview = useMemo(
    () => attendanceOverviewCopy(startDate, endDate, todayIso),
    [endDate, startDate, todayIso],
  )

  const anomaliesQuery = useQuery({
    queryKey: ['attendance-anomalies', anomalyDate],
    queryFn: async () => {
      const { data } = await attendanceService.getAnomalies(anomalyDate)
      return Array.isArray(data) ? data : []
    },
  })

  const memberHistoryQuery = useQuery({
    queryKey: ['attendance-member-history', selectedMember?.id],
    queryFn: async () => {
      const { data } = await attendanceService.getByUserId(selectedMember!.id)
      return Array.isArray(data) ? data : []
    },
    enabled: selectedMember !== null,
  })

  const invalidateAttendance = () => {
    void queryClient.invalidateQueries({ queryKey: ['attendance-paged'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance-summary'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance-anomalies'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance-member-history'] })
  }

  const checkInMutation = useMutation({
    mutationFn: () =>
      attendanceService.checkIn({
        userId: checkInUserId,
        loggedByUserId: (userId ?? 0) > 0 ? userId : undefined,
        checkInMethod,
        notes: checkInNotes.trim() || null,
        branchId: checkInBranchId,
      }),
    onSuccess: () => {
      invalidateAttendance()
      setCheckInOpen(false)
      setCheckInUserId(0)
      setCheckInMethod('FrontDesk')
      setCheckInNotes('')
      setFormError(null)
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to check in member'),
  })

  const checkOutMutation = useMutation({
    mutationFn: () =>
      attendanceService.checkOut({
        attendanceLogId: selectedCheckout?.id ?? 0,
        checkOutMethod: 'FrontDesk',
        notes: checkoutNotes.trim() || null,
      }),
    onSuccess: () => {
      invalidateAttendance()
      setSelectedCheckout(null)
      setCheckoutNotes('')
      setFormError(null)
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to check out member'),
  })

  const anomalies = anomaliesQuery.isSuccess ? anomaliesQuery.data : []
  const lateCount = anomaliesQuery.isSuccess
    ? anomalies.filter((item) => item.type === 'late').length
    : null
  const absentCount = anomaliesQuery.isSuccess
    ? anomalies.filter((item) => item.type === 'no_show').length
    : null

  const anomalyDayLabel = useMemo(() => formatGymDay(anomalyDate), [anomalyDate])

  function openCheckIn() {
    if (!canManageAttendance) return
    setFormError(null)
    setCheckInOpen(true)
  }

  function handleSubmitCheckIn(event: React.FormEvent) {
    event.preventDefault()
    if (checkInUserId <= 0) {
      setFormError('Select a member to check in.')
      return
    }
    setFormError(null)
    checkInMutation.mutate()
  }

  const openCheckout = useCallback((log: AttendanceLogDto) => {
    if (!canManageAttendance) return
    setFormError(null)
    setSelectedCheckout(log)
  }, [canManageAttendance])

  const attendanceColumns = useMemo<DataGridColumnDef<AttendanceLogDto>[]>(
    () => [
      {
        id: 'member',
        header: 'Member',
        sticky: true,
        minWidth: 220,
        width: 240,
        sortable: true,
        accessorFn: (log) => log.userName,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--dashboard-surface-muted)] text-[10px] font-semibold text-[var(--dashboard-text)]"
              aria-hidden
            >
              {memberInitials(row.userName)}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                className="truncate text-left text-sm font-medium text-[var(--dashboard-text)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() =>
                  setSelectedMember({ id: row.userId, displayName: row.userName })
                }
              >
                {row.userName}
              </button>
              <p className="truncate text-[10px] text-[var(--dashboard-muted)]">{row.notes?.trim() || 'No note'}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        minWidth: 110,
        width: 120,
        sortable: true,
        accessorFn: (log) => log.attendanceDate,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--dashboard-text)]">
            {formatGymDay(calendarDateFromApi(row.attendanceDate))}
          </span>
        ),
      },
      {
        id: 'checkIn',
        header: 'Check in',
        minWidth: 150,
        width: 160,
        hideBelow: 'md',
        accessorFn: (log) => log.checkInTime ?? '',
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[11px] text-slate-300">
            {formatDateTime(row.checkInTime)}
          </span>
        ),
      },
      {
        id: 'checkOut',
        header: 'Check out',
        minWidth: 150,
        width: 160,
        hideBelow: 'lg',
        accessorFn: (log) => log.checkOutTime ?? '',
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[11px] text-slate-300">
            {formatDateTime(row.checkOutTime)}
          </span>
        ),
      },
      {
        id: 'duration',
        header: 'Duration',
        minWidth: 100,
        width: 110,
        accessorFn: (log) => safeDuration(log),
      },
      {
        id: 'method',
        header: 'Method',
        minWidth: 100,
        width: 120,
        hideBelow: 'xl',
        accessorFn: (log) => log.checkInMethod || log.checkOutMethod || '',
      },
      {
        id: 'status',
        header: 'Status',
        minWidth: 120,
        width: 130,
        sortable: true,
        accessorFn: (log) => (log.isCheckedIn ? 'Checked in' : 'Completed'),
        cell: ({ row }) => (
          <StatusBadge variant={row.isCheckedIn ? 'success' : 'neutral'} dot>
            {row.isCheckedIn ? 'Checked in' : 'Completed'}
          </StatusBadge>
        ),
      },
      {
        id: 'actions',
        header: '',
        width: 72,
        minWidth: 72,
        align: 'right',
        stickyEnd: true,
        cell: ({ row }) => {
          const actions = [
            ...(canManageAttendance && row.isCheckedIn
              ? [{ id: 'checkout', label: 'Check out', onClick: openCheckout }]
              : []),
            {
              id: 'history',
              label: 'View history',
              onClick: (log: AttendanceLogDto) =>
                setSelectedMember({ id: log.userId, displayName: log.userName }),
            },
          ]
          return (
            <RowActionsMenu
              row={row}
              actions={actions}
              ariaLabel={`Actions for ${row.userName}`}
            />
          )
        },
      },
    ],
    [canManageAttendance, openCheckout],
  )

  const filterToolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="w-full lg:w-[23rem] lg:shrink-0">
        <span id="attendance-range-label" className={fieldLabelClass}>
          Date range
        </span>
        <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="attendance-range-label">
          <Input
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value)
              setPage(1)
            }}
            className="!px-2"
            aria-label="Range start"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value)
              setPage(1)
            }}
            className="!px-2"
            aria-label="Range end"
          />
        </div>
      </div>
      <div className="min-w-0 w-full flex-1">
        <Input
          label="Search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Member name or phone"
          aria-label="Search attendance by member name or phone"
        />
      </div>
      <div className="w-full lg:w-44 lg:shrink-0">
        <label htmlFor="attendance-status" className={fieldLabelClass}>
          Status
        </label>
        <select
          id="attendance-status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as 'all' | 'checked-in' | 'checked-out' | 'late')
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="all">All statuses</option>
          <option value="checked-in">Checked in</option>
          <option value="checked-out">Completed</option>
          <option value="late">Late</option>
        </select>
      </div>
    </div>
  )

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Attendance"
        titleBefore=""
        titleGradient="Attendance"
        subtitle="Check members in and review visits for the selected date range."
        showExport={false}
        primaryAction={
          canManageAttendance
            ? { label: 'Check in member', onClick: openCheckIn }
            : undefined
        }
      >
        <section aria-labelledby="attendance-overview-heading" className="shrink-0">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="attendance-overview-heading" className="text-sm font-semibold text-[var(--dashboard-text)]">
              {overview.title}
            </h2>
            <p className="text-xs text-[var(--dashboard-muted)]">{overview.rangeLabel}</p>
          </div>
          <p className="mb-2 text-xs text-[var(--dashboard-muted)]">
            Counts include every visit in this date range. Search and status apply to the log only.
          </p>
          {summaryQuery.isError ? (
            <div
              role="alert"
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-[var(--dashboard-text)]"
            >
              <p>{getApiErrorMessage(summaryQuery.error, 'Could not load attendance totals for this range.')}</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => void summaryQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : null}
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className={`${panelClass} px-3 py-2`}>
              <dt className="text-[11px] font-medium text-[var(--dashboard-muted)]">Total visits</dt>
              <dd className="text-lg font-semibold tabular-nums leading-tight">{summaryQuery.isSuccess ? summary!.totalVisits : '—'}</dd>
              <dd className="mt-0.5 text-[11px] leading-snug text-[var(--dashboard-muted)]">
                {summaryQuery.isSuccess ? `${summary!.uniqueMembers} ${overview.uniqueCaption}` : overview.rangeLabel}
              </dd>
            </div>
            <div className={`${panelClass} px-3 py-2`}>
              <dt className="text-[11px] font-medium text-[var(--dashboard-muted)]">Currently active</dt>
              <dd className="text-lg font-semibold tabular-nums leading-tight">{summaryQuery.isSuccess ? summary!.activeVisits : '—'}</dd>
              <dd className="mt-0.5 text-[11px] leading-snug text-[var(--dashboard-muted)]">{overview.activeCaption}</dd>
            </div>
            <div className={`${panelClass} px-3 py-2`}>
              <dt className="text-[11px] font-medium text-[var(--dashboard-muted)]">Completed sessions</dt>
              <dd className="text-lg font-semibold tabular-nums leading-tight">{summaryQuery.isSuccess ? summary!.completedSessions : '—'}</dd>
              <dd className="mt-0.5 text-[11px] leading-snug text-[var(--dashboard-muted)]">{overview.completedCaption}</dd>
            </div>
            <div className={`${panelClass} px-3 py-2`}>
              <dt className="text-[11px] font-medium text-[var(--dashboard-muted)]">Session completion</dt>
              <dd className="text-lg font-semibold tabular-nums leading-tight">
                {summaryQuery.isSuccess
                  ? `${sessionCompletionPercent(summary!.completedSessions, summary!.totalVisits)}%`
                  : '—'}
              </dd>
              <dd className="mt-0.5 text-[11px] leading-snug text-[var(--dashboard-muted)]">Completed visits / total visits</dd>
            </div>
          </dl>
        </section>

        {/* Main Content Grid */}
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          {/* Attendance Log Table */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* Filter toolbar — full-width, above the table panel */}
            <div className={`${panelClass} px-3 py-3`}>
              {filterToolbar}
            </div>
            <DashboardTablePanel
              title="Attendance log"
              description="Visits in the selected date range"
            >
              {attendanceQuery.isError ? (
                <div
                  role="alert"
                  className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-[var(--dashboard-text)]"
                >
                  <p>{getApiErrorMessage(attendanceQuery.error, 'Could not load attendance records.')}</p>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void attendanceQuery.refetch()}>
                    Try again
                  </Button>
                </div>
              ) : null}
              <EnterpriseDataGrid
                data={attendanceQuery.isError ? [] : attendanceLogs}
                columns={attendanceColumns}
                getRowId={(log) => log.id}
                loading={attendanceQuery.isLoading}
                emptyMessage={
                  attendanceQuery.isError
                    ? 'Attendance records could not be loaded.'
                    : statusFilter !== 'all' || debouncedSearch.length > 0
                      ? 'No records match your current filters.'
                      : 'No attendance records in this date range.'
                }
                pagination={
                  !attendanceQuery.isError && totalLogs > 0
                    ? {
                        page,
                        pageSize,
                        totalCount: totalLogs,
                        isFetching: attendanceQuery.isFetching,
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
          </div>

          <aside className="min-w-0 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
            <section aria-labelledby="attendance-exceptions-heading" className={`${panelClass} p-3`}>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 id="attendance-exceptions-heading" className="text-sm font-semibold">
                    Exceptions
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">
                    {anomalyDayLabel}. No-shows are inferred from the schedule when no visit was recorded.
                  </p>
                </div>
                <Input
                  type="date"
                  value={anomalyDate}
                  onChange={(event) => setAnomalyDate(event.target.value)}
                  className="!w-auto"
                  aria-label="Exception date"
                />
              </div>
              {anomaliesQuery.isSuccess ? (
                <p className="mt-2 text-xs text-[var(--dashboard-muted)]">
                  {lateCount} late
                  {' · '}
                  {absentCount} inferred no-show{absentCount === 1 ? '' : 's'}
                </p>
              ) : null}
              <div className="mt-3">
                {anomaliesQuery.isError ? (
                  <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-3 text-sm">
                    <p className="font-medium">Could not load exceptions</p>
                    <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
                      {getApiErrorMessage(anomaliesQuery.error, 'Exception monitoring failed for this date.')}
                    </p>
                    <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => void anomaliesQuery.refetch()}>
                      Try again
                    </Button>
                  </div>
                ) : !anomaliesQuery.isSuccess ? (
                  <p className="rounded-lg border border-dashed border-[var(--dashboard-border)] px-3 py-4 text-center text-sm text-[var(--dashboard-muted)]" aria-busy="true">
                    Checking exceptions for {anomalyDayLabel}…
                  </p>
                ) : anomalies.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[var(--dashboard-border)] px-3 py-4 text-center text-sm">
                    <span className="font-medium">All clear</span>
                    <span className="mt-1 block text-xs text-[var(--dashboard-muted)]">
                      No late visits or inferred no-shows for {anomalyDayLabel}.
                    </span>
                  </p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto">
                    {anomalies.map((item) => {
                      const inferred = item.type !== 'late'
                      return (
                        <li key={`${item.type}-${item.attendanceLogId ?? 'none'}-${item.userId}-${item.attendanceDate}`}>
                          <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-muted)] px-3 py-2">
                            <div className="min-w-0 space-y-1.5">
                              <p className="text-sm font-medium [overflow-wrap:anywhere]">{item.userName}</p>
                              <span
                                className={`inline-flex max-w-full rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  inferred
                                    ? 'bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)]'
                                    : 'bg-amber-500/15 text-amber-200'
                                }`}
                              >
                                {inferred ? 'Inferred no-show' : 'Late'}
                              </span>
                              <p className="text-xs text-[var(--dashboard-muted)] [overflow-wrap:anywhere]">{item.message}</p>
                            </div>
                            <button
                              type="button"
                              className="mt-1 text-xs font-medium text-sky-300 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              aria-label={`View history for ${item.userName}`}
                              onClick={() =>
                                setSelectedMember({ id: item.userId, displayName: item.userName })
                              }
                            >
                              View history
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>
          </aside>
        </div>
      </DashboardSubpageShell>

      {/* Check-In Modal - Enhanced Design */}
      <Modal open={checkInOpen && canManageAttendance} onClose={() => setCheckInOpen(false)} title="Check In Member">
        <form onSubmit={handleSubmitCheckIn} className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-[var(--dashboard-text)]"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <p>{formError}</p>
            </div>
          )}
          <AttendanceMemberPicker selectedUserId={checkInUserId} onSelect={setCheckInUserId} />
          <BranchChoiceField
            branches={branchScope ? branchScope.branches : null}
            value={checkInBranchId}
            onChange={setVisitBranch}
            defaultBranchId={branchScope?.defaultBranchId}
            label="Visited branch"
            reason="Check-in records the branch the member is entering. The membership must allow that branch."
          />
          <div className="space-y-2">
            <Input
              label="Check-in method"
              value={checkInMethod}
              onChange={(event) => setCheckInMethod(event.target.value)}
              placeholder="Front desk, QR, or mobile"
              aria-label="Check-in method"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="check-in-notes" className={fieldLabelClass}>
              Notes (optional)
            </label>
            <textarea
              id="check-in-notes"
              value={checkInNotes}
              onChange={(event) => setCheckInNotes(event.target.value)}
              rows={3}
              className={noteClass}
              placeholder="Optional note for this check-in"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCheckInOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={checkInMutation.isPending}>
              <UserCheck className="size-4" />
              Check in member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Check-Out Modal - Enhanced Design */}
      <Modal
        open={canManageAttendance && selectedCheckout !== null}
        onClose={() => setSelectedCheckout(null)}
        title={selectedCheckout ? `Check Out: ${selectedCheckout.userName}` : 'Check Out Member'}
      >
        <div className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-[var(--dashboard-text)]"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <p>{formError}</p>
            </div>
          )}
          {selectedCheckout && (
            <div className={`${panelClass} px-3 py-3`}>
              <p className="font-semibold">{selectedCheckout.userName}</p>
              <p className="text-xs text-[var(--dashboard-muted)]">
                Checked in: {formatDateTime(selectedCheckout.checkInTime)}
              </p>
              <p className="text-xs text-[var(--dashboard-muted)]">
                Duration: {safeDuration(selectedCheckout)}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="check-out-notes" className={fieldLabelClass}>
              Check-out notes (optional)
            </label>
            <textarea
              id="check-out-notes"
              value={checkoutNotes}
              onChange={(event) => setCheckoutNotes(event.target.value)}
              rows={3}
              className={noteClass}
              placeholder="Optional note for this check-out"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setSelectedCheckout(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => checkOutMutation.mutate()}
              isLoading={checkOutMutation.isPending}
            >
              <LogOut className="size-4" />
              Complete check-out
            </Button>
          </div>
        </div>
      </Modal>

      {/* Member History Modal - Enhanced Design */}
      <Modal
        open={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
        title={
          selectedMember
            ? `Attendance History: ${selectedMember.displayName}`
            : 'Member History'
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  Total Sessions:{' '}
                  <span className="text-blue-400">
                    {memberHistoryQuery.isSuccess ? memberHistoryQuery.data.length : '—'}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Showing all-time attendance records
                </p>
              </div>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {memberHistoryQuery.isError ? (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-rose-100">Could not load attendance history</p>
                <p className="mt-2 text-xs text-rose-100/80">
                  {getApiErrorMessage(memberHistoryQuery.error, 'History request failed.')}
                </p>
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => void memberHistoryQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : !memberHistoryQuery.isSuccess ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center" aria-busy="true">
                <p className="text-sm text-slate-400">Loading attendance history…</p>
              </div>
            ) : memberHistoryQuery.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
                <ClipboardList className="size-8 text-slate-600" />
                <p className="text-sm text-slate-400">No attendance history found</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {memberHistoryQuery.data.map((log) => (
                  <li key={log.id}>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.06]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-slate-400" />
                            <p className="font-semibold text-white">
                              {new Date(log.attendanceDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-slate-400">
                            <p className="flex items-center gap-2">
                              <LogIn className="size-3.5 text-emerald-400" />
                              In: {formatDateTime(log.checkInTime)}
                            </p>
                            {log.checkOutTime && (
                              <p className="flex items-center gap-2">
                                <LogOut className="size-3.5 text-violet-400" />
                                Out: {formatDateTime(log.checkOutTime)}
                              </p>
                            )}
                            <p className="flex items-center gap-2">
                              <Clock className="size-3.5 text-blue-400" />
                              Duration: {safeDuration(log)}
                            </p>
                          </div>
                          {log.notes && (
                            <p className="mt-2 text-xs italic text-slate-500">"{log.notes}"</p>
                          )}
                        </div>
                        <StatusBadge variant={log.isCheckedIn ? 'success' : 'neutral'} dot>
                          {log.isCheckedIn ? 'Active' : 'Completed'}
                        </StatusBadge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setSelectedMember(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
