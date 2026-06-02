import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceStrict } from 'date-fns'
import {
  AlertTriangle,
  CalendarRange,
  ClipboardList,
  Clock,
  LogIn,
  LogOut,
  Search,
  UserRound,
  UserX,
  Users,
} from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  DashboardSubpageShell,
  DashboardTablePanel,
} from '../components/layout/DashboardSubpageShell'
import { DataPageSection } from '../components/layout/DataPageShell'
import {
  EnterpriseDataGrid,
  RowActionsMenu,
  StatusBadge,
  type DataGridColumnDef,
} from '../components/data-grid'
import { DashboardMetricsGrid } from '../components/layout/DashboardMetricsGrid'
import { MetricCard } from '../components/dashboard/MetricCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { attendanceService } from '../services/attendance.service'
import { usersService } from '../services/users.service'
import type { AttendanceAnomalyDto, AttendanceLogDto } from '../types/attendance'
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
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
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

function selectMemberForHistory(
  userId: number,
  displayName: string,
  users: User[],
  setSelectedMember: (user: User) => void,
) {
  const match = users.find((user) => user.id === userId)
  if (match) {
    setSelectedMember(match)
    return
  }
  setSelectedMember({
    id: userId,
    firstName: displayName,
    lastName: '',
  } as User)
}

export function AttendancePage() {
  const { userName, userId } = getDashboardUser()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'checked-in' | 'checked-out' | 'late'
  >('all')
  const [startDate, setStartDate] = useState(toDateInputValue(new Date(Date.now() - 6 * 86400000)))
  const [endDate, setEndDate] = useState(toDateInputValue(new Date()))
  const [anomalyDate, setAnomalyDate] = useState(toDateInputValue(new Date()))
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInUserId, setCheckInUserId] = useState(0)
  const [checkInMethod, setCheckInMethod] = useState('FrontDesk')
  const [checkInNotes, setCheckInNotes] = useState('')
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [selectedCheckout, setSelectedCheckout] = useState<AttendanceLogDto | null>(null)
  const [selectedMember, setSelectedMember] = useState<User | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, startDate, endDate, statusFilter])

  const { data: attendancePage, isLoading, isFetching } = useQuery({
    queryKey: ['attendance-paged', page, pageSize, startDate, endDate, debouncedSearch],
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
        })
      ).data,
  })

  const { data: statsLogs = [] } = useQuery({
    queryKey: ['attendance-stats', startDate, endDate],
    queryFn: async () => {
      const { data } = await attendanceService.getPaged({
        page: 1,
        pageSize: 500,
        fromDate: startDate,
        toDate: endDate,
        sortBy: 'checkin',
        sortDir: 'desc',
      })
      return data.data ?? []
    },
  })

  const attendanceLogs = attendancePage?.data ?? []
  const totalLogs = attendancePage?.totalRecords ?? 0

  const { data: users = [] } = useQuery({
    queryKey: ['users-attendance-picker'],
    queryFn: async () => {
      const { data } = await usersService.getPaged({
        page: 1,
        pageSize: 200,
        membersOnly: true,
        isActive: true,
      })
      return data.items ?? []
    },
  })

  const { data: anomalies = [] } = useQuery({
    queryKey: ['attendance-anomalies', anomalyDate],
    queryFn: async () => {
      const { data } = await attendanceService.getAnomalies(anomalyDate)
      return Array.isArray(data) ? (data as AttendanceAnomalyDto[]) : []
    },
  })

  const { data: selectedMemberLogs = [] } = useQuery({
    queryKey: ['attendance-member-history', selectedMember?.id],
    queryFn: async () => {
      if (!selectedMember) return []
      const { data } = await attendanceService.getByUserId(selectedMember.id)
      return Array.isArray(data) ? data : []
    },
    enabled: selectedMember !== null,
  })

  const invalidateAttendance = () => {
    void queryClient.invalidateQueries({ queryKey: ['attendance-paged'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance-anomalies'] })
  }

  const checkInMutation = useMutation({
    mutationFn: () =>
      attendanceService.checkIn({
        userId: checkInUserId,
        loggedByUserId: (userId ?? 0) > 0 ? userId : undefined,
        checkInMethod,
        notes: checkInNotes.trim() || null,
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

  const filteredLogs = useMemo(() => {
    const lateUserIds = new Set(
      anomalies.filter((item) => item.type === 'late').map((item) => item.userId),
    )
    return attendanceLogs.filter((log) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'checked-in') return log.isCheckedIn
      if (statusFilter === 'checked-out') return !log.isCheckedIn
      if (statusFilter === 'late') return lateUserIds.has(log.userId)
      return true
    })
  }, [anomalies, attendanceLogs, statusFilter])

  const stats = useMemo(() => {
    const checkedIn = statsLogs.filter((log) => log.isCheckedIn).length
    const completed = statsLogs.length - checkedIn
    const uniqueMembers = new Set(statsLogs.map((log) => log.userId)).size
    const lateCount = anomalies.filter((item) => item.type === 'late').length
    const absentCount = anomalies.filter((item) => item.type === 'no_show').length
    return { total: totalLogs || statsLogs.length, checkedIn, completed, uniqueMembers, lateCount, absentCount }
  }, [anomalies, statsLogs, totalLogs])

  const anomalyDayLabel = useMemo(
    () =>
      new Date(anomalyDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [anomalyDate],
  )

  function openCheckIn() {
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

  function openCheckout(log: AttendanceLogDto) {
    setFormError(null)
    setSelectedCheckout(log)
  }

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
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[10px] font-bold text-white ring-1 ring-white/10"
              aria-hidden
            >
              {memberInitials(row.userName)}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                className="truncate text-left text-sm font-medium text-white hover:text-sky-200 hover:underline"
                onClick={() =>
                  selectMemberForHistory(row.userId, row.userName, users, setSelectedMember)
                }
              >
                {row.userName}
              </button>
              <p className="truncate text-[10px] text-slate-500">{row.notes?.trim() || 'No note'}</p>
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
          <span className="whitespace-nowrap text-slate-300">
            {new Date(row.attendanceDate).toLocaleDateString()}
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
        cell: ({ row }) =>
          row.isCheckedIn ? (
            <RowActionsMenu
              row={row}
              actions={[
                { id: 'checkout', label: 'Check out', onClick: openCheckout },
                {
                  id: 'history',
                  label: 'View history',
                  onClick: (log) =>
                    selectMemberForHistory(log.userId, log.userName, users, setSelectedMember),
                },
              ]}
            />
          ) : (
            <RowActionsMenu
              row={row}
              actions={[
                {
                  id: 'history',
                  label: 'View history',
                  onClick: (log) =>
                    selectMemberForHistory(log.userId, log.userName, users, setSelectedMember),
                },
              ]}
            />
          ),
      },
    ],
    [users],
  )

  const filterToolbar = (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <CalendarRange className="size-3.5 text-slate-500" aria-hidden />
            Log date range
          </span>
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="!py-2"
              aria-label="Attendance log start date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="!py-2"
              aria-label="Attendance log end date"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <AlertTriangle className="size-3.5 text-amber-400/80" aria-hidden />
            Exception day
          </span>
          <Input
            type="date"
            value={anomalyDate}
            onChange={(event) => setAnomalyDate(event.target.value)}
            className="!py-2"
            aria-label="Date for late and absent member detection"
          />
          <p className="text-[11px] text-slate-500">Late / absent list uses this day only.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Search className="size-3.5 text-slate-500" aria-hidden />
            Find &amp; status
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search member, note, or method…"
              className="min-w-0 flex-1 !py-2"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'checked-in' | 'checked-out' | 'late')
              }
              className={`${selectClass} min-w-[180px] py-2`}
              aria-label="Filter by attendance status"
            >
              <option value="all" className="bg-slate-900">
                All statuses
              </option>
              <option value="checked-in" className="bg-slate-900">
                Checked in
              </option>
              <option value="checked-out" className="bg-slate-900">
                Checked out
              </option>
              <option value="late" className="bg-slate-900">
                Late (exception day)
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Operations"
        titleBefore="Member "
        titleGradient="attendance"
        subtitle="Front-desk check-ins, live floor status, and exception monitoring in one operations view."
        showExport={false}
        primaryAction={{ label: '+ Check in member', onClick: openCheckIn }}
      >
        <DataPageSection>
        <DashboardMetricsGrid cols={4}>
          <MetricCard
            title="Visit logs"
            value={stats.total}
            gradient="from-sky-500 to-blue-600"
            icon={<ClipboardList className="size-5" strokeWidth={2} />}
            caption={`${startDate} → ${endDate}`}
          />
          <MetricCard
            title="Active now"
            value={stats.checkedIn}
            gradient="from-emerald-500 to-teal-500"
            icon={<LogIn className="size-5" strokeWidth={2} />}
            caption="Checked in, not out"
          />
          <MetricCard
            title="Completed"
            value={stats.completed}
            gradient="from-violet-500 to-fuchsia-500"
            icon={<LogOut className="size-5" strokeWidth={2} />}
            caption="Sessions closed"
          />
          <MetricCard
            title="Unique members"
            value={stats.uniqueMembers}
            gradient="from-amber-500 to-orange-500"
            icon={<Users className="size-5" strokeWidth={2} />}
            caption="Distinct people in range"
          />
        </DashboardMetricsGrid>

        <section
          className="glass-card relative shrink-0 overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-rose-500/[0.06]"
          aria-label="Exception summary for selected day"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/30">
                <Clock className="size-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
                  Exception snapshot
                </p>
                <p className="mt-0.5 text-sm text-slate-300">
                  Punctuality signals for{' '}
                  <span className="font-medium text-white">{anomalyDayLabel}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex min-w-[120px] flex-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:flex-initial">
                <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <AlertTriangle className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Late</p>
                  <p className="text-xl font-bold tabular-nums text-white">{stats.lateCount}</p>
                </div>
              </div>
              <div className="flex min-w-[120px] flex-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:flex-initial">
                <span className="flex size-9 items-center justify-center rounded-lg bg-slate-500/20 text-slate-200">
                  <UserX className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Absent</p>
                  <p className="text-xl font-bold tabular-nums text-white">{stats.absentCount}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        </DataPageSection>

        <div className="grid min-h-0 min-w-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-col">
            <DashboardTablePanel
              title="Attendance log"
              description="Only this grid scrolls. Check out ends an active session."
              toolbar={filterToolbar}
            >
              <EnterpriseDataGrid
                data={filteredLogs}
                columns={attendanceColumns}
                getRowId={(log) => log.id}
                loading={isLoading}
                emptyMessage={
                  attendanceLogs.length === 0
                    ? 'No attendance in this date range.'
                    : 'No rows match your filters. Widen the range or clear status filter.'
                }
                pagination={
                  totalLogs > 0
                    ? {
                        page,
                        pageSize,
                        totalCount: totalLogs,
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
          </div>

          <aside className="min-h-0 min-w-0 space-y-3 xl:overflow-y-auto">
            <section className="glass-card dashboard-card sticky top-4 min-w-0 rounded-2xl">
              <div className="border-b border-white/5 px-5 py-4">
                <h2 className="text-base font-semibold text-white">Daily exceptions</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Late arrivals and no-shows for the exception day above.
                </p>
              </div>
              <div className="max-h-[min(520px,calc(100vh-12rem))] overflow-y-auto p-4">
                {anomalies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25">
                      <UserRound className="size-5" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">All clear</p>
                      <p className="mt-1 text-xs text-slate-500">
                        No late or absent signals for {anomalyDayLabel}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {anomalies.map((item) => (
                      <li key={`${item.type}-${item.userId}-${item.attendanceDate}`}>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/15 hover:bg-white/[0.05]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[11px] font-bold text-white ring-1 ring-white/10"
                                aria-hidden
                              >
                                {memberInitials(item.userName)}
                              </div>
                              <p className="truncate text-sm font-medium text-white">{item.userName}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                item.type === 'late'
                                  ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                                  : 'bg-slate-600/30 text-slate-200 ring-1 ring-slate-500/25'
                              }`}
                            >
                              {item.type === 'late' ? 'Late' : 'Absent'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.message}</p>
                          <button
                            type="button"
                            className="mt-3 text-xs font-semibold text-sky-400 hover:text-sky-300"
                            onClick={() =>
                              selectMemberForHistory(item.userId, item.userName, users, setSelectedMember)
                            }
                          >
                            View attendance history
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </aside>
        </div>
      </DashboardSubpageShell>

      <Modal open={checkInOpen} onClose={() => setCheckInOpen(false)} title="Check in member">
        <form onSubmit={handleSubmitCheckIn} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            >
              {formError}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Member
            </label>
            <select
              value={checkInUserId}
              onChange={(event) => setCheckInUserId(Number(event.target.value))}
              className={selectClass}
              aria-label="Member to check in"
            >
              <option value={0} className="bg-slate-900">
                Select member
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id} className="bg-slate-900">
                  {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || `User #${user.id}`}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Method"
            value={checkInMethod}
            onChange={(event) => setCheckInMethod(event.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Notes
            </label>
            <textarea
              value={checkInNotes}
              onChange={(event) => setCheckInNotes(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              placeholder="Optional front-desk note"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCheckInOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={checkInMutation.isPending}>
              Check in
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={selectedCheckout !== null}
        onClose={() => setSelectedCheckout(null)}
        title={selectedCheckout ? `Check out ${selectedCheckout.userName}` : 'Check out'}
      >
        <div className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            >
              {formError}
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
            <p>Checked in at: {formatDateTime(selectedCheckout?.checkInTime)}</p>
            <p className="mt-1">Method: {selectedCheckout?.checkInMethod || 'FrontDesk'}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Notes
            </label>
            <textarea
              value={checkoutNotes}
              onChange={(event) => setCheckoutNotes(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              placeholder="Optional check-out note"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelectedCheckout(null)}>
              Cancel
            </Button>
            <Button type="button" isLoading={checkOutMutation.isPending} onClick={() => checkOutMutation.mutate()}>
              Check out
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
        title={
          selectedMember
            ? `Attendance history: ${`${selectedMember.firstName ?? ''} ${selectedMember.lastName ?? ''}`.trim()}`
            : 'Attendance history'
        }
        size="wide"
      >
        <div className="space-y-3">
          {selectedMemberLogs.length === 0 ? (
            <p className="text-sm text-slate-400">No attendance history found for this member.</p>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check in</th>
                    <th className="px-4 py-3">Check out</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMemberLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(log.attendanceDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-slate-300">
                        {formatDateTime(log.checkInTime)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-slate-300">
                        {formatDateTime(log.checkOutTime)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-300">{safeDuration(log)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.isCheckedIn
                              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                              : 'bg-white/[0.06] text-slate-300 ring-1 ring-white/10'
                          }`}
                        >
                          {log.isCheckedIn ? 'Checked in' : 'Checked out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
