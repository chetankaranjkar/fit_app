import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { DataPageSection } from '../components/layout/DataPageShell'
import { AddTrainerModal } from '../components/trainers/AddTrainerModal'
import { Button } from '../components/ui/Button'
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

export function TrainersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userName } = getDashboardUser()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [addOpen, setAddOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
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
  }, [debouncedSearch])

  const { data: trainersPage, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['trainers-paged', page, pageSize, debouncedSearch],
    queryFn: async () => (await trainersService.getPaged({ page, pageSize, search: debouncedSearch || undefined })).data,
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

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Staff"
        titleGradient="Trainers"
        subtitle="Trainer profiles are saved to the database (Trainer table, linked to Users). Create a member user first, then add them as a trainer."
        primaryAction={{ label: '+ Add trainer', onClick: () => setAddOpen(true) }}
        showExport={false}
      >
        <DataPageSection>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total trainers" value={stats?.totalTrainers ?? trainers.length} />
            <StatCard
              label="Active"
              value={stats?.activeTrainers ?? trainers.filter((t) => t.isActive).length}
              accent="text-emerald-300"
            />
            <StatCard label="On leave" value={stats?.onLeave ?? 0} accent="text-amber-300" />
            <StatCard label="Clients assigned" value={stats?.totalClientsAssigned ?? 0} />
          </div>
        </DataPageSection>

        <DashboardTablePanel
          title="Trainer directory"
          description="Search, sort, and open trainer profiles."
          toolbar={
            <DataToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name, email, phone, Aadhaar…"
              searchAriaLabel="Search trainers"
            />
          }
        >
          {isError ? (
            <div className="shrink-0 px-6 py-8">
              <p className="text-sm text-rose-300">Could not load trainers. Is the API running?</p>
              <Button variant="soft" size="sm" className="mt-3" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <EnterpriseDataGrid
              data={trainers}
              columns={columns}
              getRowId={(t) => t.id}
              loading={isLoading}
              emptyMessage={
                totalTrainers === 0
                  ? 'No trainers yet. Click "+ Add trainer" to create one.'
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
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <AddTrainerModal open={addOpen} onClose={() => setAddOpen(false)} />
    </DashboardLayout>
  )
}

function StatCard({
  label,
  value,
  accent = 'text-white',
}: {
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  )
}
