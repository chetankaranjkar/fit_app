import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EnterpriseDataGrid, RowActionsMenu, type DataGridColumnDef } from '../data-grid'
import { MembershipStatusBadge } from '../billing/MembershipStatusBadge'
import {
  getMembershipCollectPaymentPath,
  memberMembershipHistoryPath,
  membershipStatusClickTitle,
} from '../../lib/membershipPaymentNavigation'
import {
  membershipDaysLeftClass,
  membershipDaysLeftLabel,
  membershipPaymentClass,
  membershipPaymentSummary,
} from '../../lib/userMembershipListUtils'
import type { MembershipStatus, UserMembership } from '../../types/userMembership'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

type UserMembershipsGridProps = {
  memberships: UserMembership[]
  loading: boolean
  isFetching: boolean
  page: number
  pageSize: number
  totalCount: number
  emptyMessage: string
  returnTo: string
  highlightMembershipId?: number | null
  onOpenDetail: (membership: UserMembership) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onEdit: (membership: UserMembership) => void
  onRequestVoid: (membership: UserMembership) => void
  onRenew: (membership: UserMembership) => void
  pageScroll?: boolean
}

export function UserMembershipsGrid({
  memberships,
  loading,
  isFetching,
  page,
  pageSize,
  totalCount,
  emptyMessage,
  returnTo,
  highlightMembershipId,
  onOpenDetail,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onRequestVoid,
  onRenew,
  pageScroll = false,
}: UserMembershipsGridProps) {
  const navigate = useNavigate()

  const membershipStatusAction = (m: UserMembership) => {
    const collectPath = getMembershipCollectPaymentPath(m, returnTo)
    if (collectPath) return () => navigate(collectPath)
    if (m.status === 'Paused') return () => onEdit(m)
    return () => navigate(memberMembershipHistoryPath(m.userId))
  }

  const membershipStatusTitle = (status: MembershipStatus) => {
    const collectTitle = membershipStatusClickTitle(status)
    if (collectTitle) return collectTitle
    if (status === 'Paused') return 'Edit membership'
    return 'Open membership history'
  }

  const columns = useMemo<DataGridColumnDef<UserMembership>[]>(
    () => [
      {
        id: 'id',
        header: 'ID',
        width: 88,
        minWidth: 72,
        sortable: true,
        accessorFn: (m) => m.id,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onOpenDetail(row)}
            className="font-mono text-xs text-blue-300 hover:text-blue-200"
            title={`View membership #${row.id}`}
          >
            #{row.id}
          </button>
        ),
      },
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
              to={memberMembershipHistoryPath(row.userId)}
              className="truncate font-medium text-blue-300 hover:text-blue-200"
              title="Open membership history"
            >
              {row.userName}
            </Link>
          ) : (
            <Link
              to={memberMembershipHistoryPath(row.userId)}
              className="text-slate-300 hover:text-blue-200"
            >
              User #{row.userId}
            </Link>
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
        id: 'period',
        header: 'Period',
        minWidth: 180,
        width: 190,
        hideBelow: 'lg',
        accessorFn: (m) => m.endDate,
        cell: ({ row }) => (
          <span className="text-slate-300">
            {formatDate(row.startDate)} – {formatDate(row.endDate)}
          </span>
        ),
      },
      {
        id: 'daysLeft',
        header: 'Timeline',
        minWidth: 110,
        width: 120,
        sortable: true,
        accessorFn: (m) => m.daysRemaining ?? 0,
        cell: ({ row }) => (
          <span className={`text-xs font-medium ${membershipDaysLeftClass(row)}`}>
            {membershipDaysLeftLabel(row)}
          </span>
        ),
      },
      {
        id: 'payment',
        header: 'Payment',
        minWidth: 130,
        width: 150,
        hideBelow: 'md',
        accessorFn: (m) => m.pendingAmount ?? 0,
        cell: ({ row }) => (
          <span className={`text-xs ${membershipPaymentClass(row)}`}>{membershipPaymentSummary(row)}</span>
        ),
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
              { id: 'details', label: 'View details', onClick: onOpenDetail },
              {
                id: 'collect',
                label: 'Collect payment',
                variant: 'success',
                hidden: (m) => !getMembershipCollectPaymentPath(m, returnTo),
                onClick: (m) => {
                  const path = getMembershipCollectPaymentPath(m, returnTo)
                  if (path) navigate(path)
                },
              },
              {
                id: 'renew',
                label: 'Renew membership',
                hidden: (m) => m.status !== 'Expired',
                onClick: onRenew,
              },
              {
                id: 'history',
                label: 'View membership history',
                onClick: (m) => navigate(memberMembershipHistoryPath(m.userId)),
              },
              { id: 'edit', label: 'Edit', onClick: onEdit },
              {
                id: 'void',
                label: 'Request void',
                variant: 'danger',
                hidden: (m) => m.status === 'Voided' || m.status === 'Transferred',
                onClick: onRequestVoid,
              },
            ]}
          />
        ),
      },
    ],
    [navigate, onEdit, onOpenDetail, onRenew, onRequestVoid, returnTo],
  )

  return (
    <EnterpriseDataGrid
      data={memberships}
      columns={columns}
      getRowId={(m) => m.id}
      loading={loading}
      emptyMessage={emptyMessage}
      pageScroll={pageScroll}
      getRowClassName={(row) =>
        highlightMembershipId != null && row.id === highlightMembershipId
          ? 'bg-amber-500/10 ring-1 ring-inset ring-amber-400/30'
          : undefined
      }
      pagination={
        totalCount > 0
          ? {
              page,
              pageSize,
              totalCount,
              isFetching,
              pageSizeOptions: [25, 50, 100],
              onPageChange,
              onPageSizeChange: (size) => {
                onPageSizeChange(size)
                onPageChange(1)
              },
            }
          : undefined
      }
    />
  )
}
