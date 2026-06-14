import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarOff,
  LayoutGrid,
  Plus,
  Table2,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardPageContent } from '../components/layout/DataPageShell'
import { DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { MetricCard } from '../components/dashboard/MetricCard'
import { TrainerCard } from '../components/trainers/TrainerCard'
import { AddTrainerModal } from '../components/trainers/AddTrainerModal'
import { Button } from '../components/ui/Button'
import { ListPagination } from '../components/ui/ListPagination'
import { Skeleton } from '../components/ui/Skeleton'
import {
  DataToolbar,
  EnterpriseDataGrid,
  RowActionsMenu,
  StatusBadge,
  type DataGridColumnDef,
} from '../components/data-grid'
import { trainersService } from '../services/trainers.service'
import { trainerFullName } from '../types/trainer'
import type { Trainer } from '../types/trainer'
import { displayAadhaar } from '../lib/aadhaar'

type ViewMode = 'cards' | 'table'
type StatusFilter = 'all' | 'active' | 'inactive'

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

const filterPills: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All coaches' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
]

export function TrainersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userName } = getDashboardUser()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [addOpen, setAddOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('cards')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, view])

  useEffect(() => {
    setPageSize(view === 'cards' ? 12 : 25)
  }, [view])

  const isActiveParam =
    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined

  const { data: trainersPage, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['trainers-paged', page, pageSize, debouncedSearch, statusFilter],
    queryFn: async () =>
      (
        await trainersService.getPaged({
          page,
          pageSize,
          search: debouncedSearch || undefined,
          isActive: isActiveParam,
        })
      ).data,
  })

  const trainers = trainersPage?.data ?? []
  const totalTrainers = trainersPage?.totalRecords ?? 0

  const { data: stats } = useQuery({
    queryKey: ['trainer-stats'],
    queryFn: async () => (await trainersService.getStats()).data,
  })

  const columns = useMemo<DataGridColumnDef<Trainer>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        sticky: true,
        minWidth: 220,
        width: 250,
        sortable: true,
        accessorFn: (t) => trainerFullName(t),
        cell: ({ row }) => (
          <span className="font-medium text-white">{trainerFullName(row)}</span>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        minWidth: 180,
        width: 200,
        sortable: true,
        hideBelow: 'md',
        accessorFn: (t) => t.email ?? '',
        cell: ({ value }) => <span className="text-slate-300">{String(value) || '—'}</span>,
      },
      {
        id: 'aadhaar',
        header: 'Aadhaar',
        minWidth: 150,
        width: 160,
        hideBelow: 'md',
        accessorFn: (t) => t.aadhaarNumber ?? t.aadhaarNumberMasked ?? '',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-300">{displayAadhaar(row)}</span>
        ),
      },
      {
        id: 'code',
        header: 'Code',
        minWidth: 100,
        width: 120,
        hideBelow: 'lg',
        accessorFn: (t) => t.employeeCode ?? '',
      },
      {
        id: 'specialization',
        header: 'Specialization',
        minWidth: 140,
        width: 160,
        hideBelow: 'lg',
        accessorFn: (t) => t.specialization ?? '',
      },
      {
        id: 'clients',
        header: 'Clients',
        minWidth: 100,
        width: 110,
        sortable: true,
        align: 'right',
        accessorFn: (t) => t.totalClients,
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-300">
            {row.totalClients}
            {row.maxClients ? ` / ${row.maxClients}` : ''}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        minWidth: 100,
        width: 120,
        sortable: true,
        accessorFn: (t) => (t.isActive ? 'Active' : 'Inactive'),
        cell: ({ row }) => (
          <StatusBadge variant={row.isActive ? 'success' : 'neutral'} dot>
            {row.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>
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
              {
                id: 'view',
                label: 'View profile',
                onClick: (t) => navigate(`/dashboard/trainers/${t.id}`),
              },
            ]}
          />
        ),
      },
    ],
    [navigate],
  )

  const activeCount = stats?.activeTrainers ?? trainers.filter((t) => t.isActive).length
  const utilizationPct =
    stats?.totalTrainers && stats.totalClientsAssigned
      ? Math.min(100, Math.round((stats.totalClientsAssigned / Math.max(stats.totalTrainers * 10, 1)) * 100))
      : null

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-[1400px] space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-blue-500/25 bg-gradient-to-br from-blue-600/30 via-violet-600/15 to-[rgba(11,11,26,0.4)] p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-violet-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-blue-500/15 blur-3xl"
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/80">
                Staff · Coaching team
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                Your{' '}
                <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                  trainer roster
                </span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300/90 sm:text-base">
                Browse coach profiles, capacity, and specializations. Create a member user first, then
                add them as a trainer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110"
            >
              <Plus className="size-4" />
              Add trainer
            </button>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total trainers"
              value={stats?.totalTrainers ?? totalTrainers}
              gradient="from-blue-500 to-cyan-500"
              icon={<Users className="size-4" />}
              caption="Registered coaches"
            />
            <MetricCard
              title="Active now"
              value={activeCount}
              gradient="from-emerald-500 to-teal-500"
              icon={<UserCheck className="size-4" />}
              caption="Available to assign"
            />
            <MetricCard
              title="On leave"
              value={stats?.onLeave ?? 0}
              gradient="from-amber-500 to-orange-500"
              icon={<CalendarOff className="size-4" />}
              caption="Temporarily unavailable"
            />
            <MetricCard
              title="Clients assigned"
              value={stats?.totalClientsAssigned ?? 0}
              gradient="from-violet-500 to-fuchsia-500"
              icon={<UsersRound className="size-4" />}
              caption={utilizationPct != null ? `~${utilizationPct}% roster load` : 'Across all coaches'}
            />
          </div>
        </header>

        <div className="glass-card flex flex-col gap-4 rounded-2xl border border-white/10 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <DataToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name, email, phone, Aadhaar…"
              searchAriaLabel="Search trainers"
              className="min-w-0 flex-1"
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {filterPills.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === pill.id
                        ? 'bg-gradient-to-r from-blue-500/30 to-violet-500/30 text-white shadow-sm ring-1 ring-white/10'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
              <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setView('cards')}
                  aria-pressed={view === 'cards'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    view === 'cards'
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="size-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setView('table')}
                  aria-pressed={view === 'table'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    view === 'table'
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Table2 className="size-3.5" />
                  Table
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            {totalTrainers} coach{totalTrainers !== 1 ? 'es' : ''} in directory
            {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
          </p>
        </div>

        {isError ? (
          <div className="glass-card rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
            <p className="text-sm font-medium text-rose-200">Could not load trainers. Is the API running?</p>
            <Button variant="soft" size="sm" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : view === 'cards' ? (
          <>
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[420px] rounded-2xl" />
                ))}
              </div>
            ) : trainers.length === 0 ? (
              <EmptyTrainersState
                hasSearch={Boolean(debouncedSearch) || statusFilter !== 'all'}
                onAdd={() => setAddOpen(true)}
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {trainers.map((trainer) => (
                  <TrainerCard
                    key={trainer.id}
                    trainer={trainer}
                    onView={() => navigate(`/dashboard/trainers/${trainer.id}`)}
                  />
                ))}
              </div>
            )}
            {totalTrainers > 0 ? (
              <ListPagination
                page={page}
                pageSize={pageSize}
                totalCount={totalTrainers}
                isFetching={isFetching}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
                pageSizeOptions={[12, 24, 48]}
              />
            ) : null}
          </>
        ) : (
          <div className="flex min-h-[520px] flex-col">
            <DashboardTablePanel title="Trainer directory" description="Sortable table view for bulk review.">
              <EnterpriseDataGrid
                data={trainers}
                columns={columns}
                getRowId={(t) => t.id}
                loading={isLoading}
                emptyMessage={
                  totalTrainers === 0
                    ? 'No trainers yet. Click "Add trainer" to create one.'
                    : 'No trainers match your search.'
                }
                pagination={
                  totalTrainers > 0
                    ? {
                        page,
                        pageSize,
                        totalCount: totalTrainers,
                        isFetching,
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
        )}
      </DashboardPageContent>

      <AddTrainerModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => setPage(1)} />
    </DashboardLayout>
  )
}

function EmptyTrainersState({
  hasSearch,
  onAdd,
}: {
  hasSearch: boolean
  onAdd: () => void
}) {
  return (
    <div className="glass-card flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 ring-1 ring-white/10">
        <Users className="size-8 text-violet-300" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-white">
        {hasSearch ? 'No coaches match your filters' : 'Build your coaching team'}
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        {hasSearch
          ? 'Try a different search or clear filters to see the full roster.'
          : 'Add your first trainer to manage schedules, client assignments, and program delivery.'}
      </p>
      {!hasSearch ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/25 transition hover:brightness-110"
        >
          <Plus className="size-4" />
          Add your first trainer
        </button>
      ) : null}
    </div>
  )
}
