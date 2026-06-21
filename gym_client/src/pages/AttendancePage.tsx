import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceStrict } from 'date-fns'
import {
  AlertTriangle,
  Calendar,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock,
  LogIn,
  LogOut,
  Search,
  TrendingUp,
  UserCheck,
  UserRound,
  UserX,
  Users,
  Activity,
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
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[min(100%,280px)] flex-1 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <CalendarRange className="size-3.5 shrink-0 text-sky-400" aria-hidden />
            Date Range
          </label>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="!py-2.5 text-xs"
              aria-label="Start date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="!py-2.5 text-xs"
              aria-label="End date"
            />
          </div>
        </div>
        <div className="min-w-[min(100%,220px)] flex-[1.2] space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Search className="size-3.5 shrink-0 text-emerald-400" aria-hidden />
            Search
          </label>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Member name, notes..."
            className="!py-2.5 text-sm"
          />
        </div>
        <div className="min-w-[min(100%,180px)] flex-1 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Activity className="size-3.5 shrink-0 text-violet-400" aria-hidden />
            Status Filter
          </label>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'all' | 'checked-in' | 'checked-out' | 'late')
            }
            className={`${selectClass} py-2.5`}
            aria-label="Filter by status"
          >
            <option value="all" className="bg-slate-900">All Statuses</option>
            <option value="checked-in" className="bg-slate-900">✓ Checked In</option>
            <option value="checked-out" className="bg-slate-900">✓ Completed</option>
            <option value="late" className="bg-slate-900">⚠ Late</option>
          </select>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Operations Hub"
        titleBefore="Live "
        titleGradient="Attendance"
        subtitle="Real-time member activity tracking, check-in management, and attendance analytics"
        showExport={false}
        primaryAction={{ label: '+ Check In Member', onClick: openCheckIn }}
      >
        <DataPageSection>
          {/* Enhanced Metrics with Better Visual Hierarchy */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Today's Overview</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="size-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <DashboardMetricsGrid cols={4}>
              <MetricCard
                title="Total Visits"
                value={stats.total}
                gradient="from-blue-500 via-sky-500 to-cyan-500"
                icon={<ClipboardList className="size-5" strokeWidth={2.5} />}
                caption={`${stats.uniqueMembers} unique members`}
              />
              <MetricCard
                title="Currently Active"
                value={stats.checkedIn}
                gradient="from-emerald-500 via-green-500 to-teal-500"
                icon={<UserCheck className="size-5" strokeWidth={2.5} />}
                caption="On gym floor now"
              />
              <MetricCard
                title="Completed Sessions"
                value={stats.completed}
                gradient="from-violet-500 via-purple-500 to-fuchsia-500"
                icon={<CheckCircle2 className="size-5" strokeWidth={2.5} />}
                caption="Checked out today"
              />
              <MetricCard
                title="Attendance Rate"
                value={`${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`}
                gradient="from-amber-500 via-orange-500 to-rose-500"
                icon={<TrendingUp className="size-5" strokeWidth={2.5} />}
                caption="Session completion"
              />
            </DashboardMetricsGrid>
          </div>

          {/* Exception Monitoring Card - Redesigned */}
          <div className="mb-6">
            <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-rose-500/[0.06] backdrop-blur-xl">
              <div className="border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/20">
                      <AlertTriangle className="size-6" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Exception Monitor</h3>
                      <p className="text-sm text-amber-100/80">Track attendance anomalies</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-amber-200/80">Monitor Date:</label>
                    <Input
                      type="date"
                      value={anomalyDate}
                      onChange={(event) => setAnomalyDate(event.target.value)}
                      className="!w-auto !py-2 text-sm"
                      aria-label="Exception monitoring date"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="group relative overflow-hidden rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 transition-all hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/10">
                  <div className="relative flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30 transition-transform group-hover:scale-105">
                      <Clock className="size-6" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">Late Arrivals</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-white">{stats.lateCount}</p>
                      <p className="mt-1 text-xs text-amber-200/60">{anomalyDayLabel}</p>
                    </div>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-xl border border-slate-500/20 bg-gradient-to-br from-slate-500/10 to-slate-600/5 p-5 transition-all hover:border-slate-400/40 hover:shadow-lg hover:shadow-slate-500/10">
                  <div className="relative flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-xl bg-slate-500/20 text-slate-300 ring-1 ring-slate-400/30 transition-transform group-hover:scale-105">
                      <UserX className="size-6" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-300/80">No Shows</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-white">{stats.absentCount}</p>
                      <p className="mt-1 text-xs text-slate-300/60">{anomalyDayLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DataPageSection>

        {/* Main Content Grid */}
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          {/* Attendance Log Table */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* Filter toolbar — full-width, above the table panel */}
            <div className="glass-card rounded-2xl px-5 py-4">
              {filterToolbar}
            </div>
            <DashboardTablePanel
              title="Attendance Log"
              description="Complete attendance history with real-time updates"
            >
              <EnterpriseDataGrid
                data={filteredLogs}
                columns={attendanceColumns}
                getRowId={(log) => log.id}
                loading={isLoading}
                emptyMessage={
                  attendanceLogs.length === 0
                    ? 'No attendance records in this date range.'
                    : 'No records match your current filters.'
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

          {/* Right Sidebar - Quick Actions & Exceptions */}
          <aside className="min-w-0 space-y-4">
            {/* Quick Actions Panel */}
            <section className="overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] to-sky-500/[0.04] backdrop-blur-xl">
              <div className="border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-transparent px-5 py-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                  <LogIn className="size-5 text-blue-400" />
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-3 p-5">
                <Button
                  onClick={openCheckIn}
                  className="w-full justify-center bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
                >
                  <UserCheck className="size-4" />
                  Check In Member
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <p className="text-2xl font-bold tabular-nums text-emerald-400">{stats.checkedIn}</p>
                    <p className="mt-1 text-xs text-slate-400">Active Now</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <p className="text-2xl font-bold tabular-nums text-violet-400">{stats.completed}</p>
                    <p className="mt-1 text-xs text-slate-400">Completed</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Exception Details Panel */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
              <div className="border-b border-white/5 bg-white/[0.02] px-5 py-4">
                <h3 className="text-base font-semibold text-white">Exception Details</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Late arrivals and no-shows for {anomalyDayLabel}
                </p>
              </div>
              <div className="overflow-y-auto p-4">
                {anomalies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.03] px-4 py-16 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="size-8" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-emerald-300">All Clear!</p>
                      <p className="mt-2 text-sm text-slate-400">
                        No attendance exceptions detected
                      </p>
                      <p className="mt-1 text-xs text-slate-500">for {anomalyDayLabel}</p>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {anomalies.map((item) => (
                      <li key={`${item.type}-${item.userId}-${item.attendanceDate}`}>
                        <div className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:shadow-lg">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white ring-2 ring-white/20 shadow-lg"
                                aria-hidden
                              >
                                {memberInitials(item.userName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">{item.userName}</p>
                                <p className="mt-0.5 truncate text-xs text-slate-400">{item.message}</p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-2 ${
                                item.type === 'late'
                                  ? 'bg-amber-500/20 text-amber-300 ring-amber-400/40'
                                  : 'bg-slate-600/30 text-slate-300 ring-slate-500/40'
                              }`}
                            >
                              {item.type === 'late' ? 'Late' : 'Absent'}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="mt-3 text-xs font-semibold text-sky-400 transition-colors hover:text-sky-300"
                            onClick={() =>
                              selectMemberForHistory(item.userId, item.userName, users, setSelectedMember)
                            }
                          >
                            View Full History →
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

      {/* Check-In Modal - Enhanced Design */}
      <Modal open={checkInOpen} onClose={() => setCheckInOpen(false)} title="Check In Member">
        <form onSubmit={handleSubmitCheckIn} className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 backdrop-blur-sm"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <p>{formError}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Users className="size-3.5 text-blue-400" />
              Select Member
            </label>
            <select
              value={checkInUserId}
              onChange={(event) => setCheckInUserId(Number(event.target.value))}
              className={`${selectClass} py-3`}
              aria-label="Member to check in"
            >
              <option value={0} className="bg-slate-900">
                Choose a member...
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id} className="bg-slate-900">
                  {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || `User #${user.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Activity className="size-3.5 text-emerald-400" />
              Check-In Method
            </label>
            <Input
              value={checkInMethod}
              onChange={(event) => setCheckInMethod(event.target.value)}
              placeholder="e.g., Front Desk, QR Code, Mobile App"
              className="py-3"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <ClipboardList className="size-3.5 text-violet-400" />
              Notes (Optional)
            </label>
            <textarea
              value={checkInNotes}
              onChange={(event) => setCheckInNotes(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              placeholder="Add any relevant notes about this check-in..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCheckInOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={checkInMutation.isPending}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25"
            >
              <UserCheck className="size-4" />
              Check In Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Check-Out Modal - Enhanced Design */}
      <Modal
        open={selectedCheckout !== null}
        onClose={() => setSelectedCheckout(null)}
        title={selectedCheckout ? `Check Out: ${selectedCheckout.userName}` : 'Check Out Member'}
      >
        <div className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 backdrop-blur-sm"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <p>{formError}</p>
            </div>
          )}
          {selectedCheckout && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-bold text-white ring-2 ring-white/20">
                  {memberInitials(selectedCheckout.userName)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{selectedCheckout.userName}</p>
                  <p className="text-xs text-slate-400">
                    Checked in: {formatDateTime(selectedCheckout.checkInTime)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Duration: {safeDuration(selectedCheckout)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <ClipboardList className="size-3.5 text-violet-400" />
              Check-Out Notes (Optional)
            </label>
            <textarea
              value={checkoutNotes}
              onChange={(event) => setCheckoutNotes(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              placeholder="Add any notes about this check-out..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setSelectedCheckout(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => checkOutMutation.mutate()}
              isLoading={checkOutMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-violet-500/25"
            >
              <LogOut className="size-4" />
              Complete Check-Out
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
            ? `Attendance History: ${selectedMember.firstName} ${selectedMember.lastName}`
            : 'Member History'
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  Total Sessions: <span className="text-blue-400">{selectedMemberLogs.length}</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Showing all-time attendance records
                </p>
              </div>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {selectedMemberLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
                <ClipboardList className="size-8 text-slate-600" />
                <p className="text-sm text-slate-400">No attendance history found</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {selectedMemberLogs.map((log) => (
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
            <Button variant="secondary" onClick={() => setSelectedMember(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
