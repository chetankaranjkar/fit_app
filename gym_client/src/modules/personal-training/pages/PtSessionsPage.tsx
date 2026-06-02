import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { DataPageSection } from '../../../components/layout/DataPageShell'
import {
  DataToolbar,
  EnterpriseDataGrid,
  StatusBadge,
  type DataGridColumnDef,
} from '../../../components/data-grid'
import { ptSessionsService } from '../../../services/personalTraining.service'
import type { PTSession } from '../../../types/personalTraining'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return u?.fullName?.trim() || u?.username?.trim() || 'User'
  } catch {
    return 'User'
  }
}

export function PtSessionsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    setPage(1)
  }, [from, to])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['pt-sessions', from, to, page, pageSize],
    queryFn: async () =>
      (
        await ptSessionsService.search({
          page,
          pageSize,
          fromUtc: from ? new Date(from).toISOString() : undefined,
          toUtc: to ? new Date(to).toISOString() : undefined,
        })
      ).data,
  })

  const items = data?.items ?? []
  const total = data?.totalCount ?? items.length

  const columns = useMemo<DataGridColumnDef<PTSession>[]>(
    () => [
      {
        id: 'when',
        header: 'When',
        sticky: true,
        minWidth: 180,
        width: 200,
        sortable: true,
        accessorFn: (s) => s.scheduledStartUtc,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-white">
            {new Date(row.scheduledStartUtc).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'member',
        header: 'Member',
        minWidth: 160,
        width: 180,
        sortable: true,
        accessorFn: (s) => s.memberName,
      },
      {
        id: 'trainer',
        header: 'Trainer',
        minWidth: 160,
        width: 180,
        hideBelow: 'md',
        accessorFn: (s) => s.trainerName,
      },
      {
        id: 'status',
        header: 'Status',
        minWidth: 120,
        width: 130,
        sortable: true,
        accessorFn: (s) => s.status,
        cell: ({ value }) => (
          <StatusBadge variant="info">{String(value)}</StatusBadge>
        ),
      },
      {
        id: 'remaining',
        header: 'Remaining',
        minWidth: 100,
        width: 110,
        align: 'right',
        accessorFn: (s) => s.remainingSessions,
        cell: ({ value }) => <span className="tabular-nums">{String(value)}</span>,
      },
    ],
    [],
  )

  return (
    <DashboardLayout userName={getDashboardUser()}>
      <DashboardSubpageShell
        eyebrow="Personal Training"
        titleGradient="Session calendar"
        subtitle="Booked and completed PT sessions."
        showExport={false}
      >
        <DataPageSection>
          <DataToolbar
            filters={
              <>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  aria-label="To date"
                />
              </>
            }
          />
        </DataPageSection>

        <DashboardTablePanel title="Sessions" description="Filter by date range; only the grid scrolls.">
          <EnterpriseDataGrid
            data={items}
            columns={columns}
            getRowId={(s) => s.id}
            loading={isLoading}
            emptyMessage="No PT sessions in this range."
            pagination={
              total > 0
                ? {
                    page,
                    pageSize,
                    totalCount: total,
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
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
