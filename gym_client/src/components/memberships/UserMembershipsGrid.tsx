import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EnterpriseDataGrid, RowActionsMenu, type DataGridColumnDef } from '../data-grid'
import { MembershipStatusBadge } from '../billing/MembershipStatusBadge'
import { StandingFactValue } from './MembershipStandingPanel'
import {
  getMembershipCollectPaymentPath,
  memberMembershipHistoryPath,
} from '../../lib/membershipPaymentNavigation'
import {
  COLLECT_OUTSTANDING_LABEL,
  RENEW_MEMBERSHIP_LABEL,
  STANDING_TONE_TEXT,
  standingFromUserMembership,
} from '../../lib/membershipStanding'
import type { UserMembership } from '../../types/userMembership'

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

  const membershipStatusTitle = (m: UserMembership) => {
    if (getMembershipCollectPaymentPath(m, returnTo)) return COLLECT_OUTSTANDING_LABEL
    if (m.status === 'Paused') return 'Edit membership'
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
        id: 'dates',
        header: 'Membership dates',
        minWidth: 190,
        width: 200,
        sortable: true,
        accessorFn: (m) => m.endDate,
        cell: ({ row }) => <StandingFactValue fact={standingFromUserMembership(row).dates} compact />,
      },
      {
        id: 'access',
        header: 'Gym access',
        minWidth: 150,
        width: 170,
        hideBelow: 'md',
        accessorFn: (m) => (standingFromUserMembership(m).access.allowed ? 1 : 0),
        cell: ({ row }) => <StandingFactValue fact={standingFromUserMembership(row).access} compact />,
      },
      {
        id: 'payment',
        header: 'Payment status',
        minWidth: 120,
        width: 130,
        hideBelow: 'md',
        accessorFn: (m) => standingFromUserMembership(m).payment.label,
        cell: ({ row }) => <StandingFactValue fact={standingFromUserMembership(row).payment} compact />,
      },
      {
        id: 'outstanding',
        header: 'Outstanding',
        minWidth: 110,
        width: 120,
        align: 'right',
        sortable: true,
        accessorFn: (m) => m.pendingAmount ?? 0,
        cell: ({ row }) => {
          const fact = standingFromUserMembership(row).outstanding
          return <span className={`text-xs font-medium tabular-nums ${STANDING_TONE_TEXT[fact.tone]}`}>{fact.label}</span>
        },
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
            title={membershipStatusTitle(row)}
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
                label: COLLECT_OUTSTANDING_LABEL,
                variant: 'success',
                disabled: (m) => !getMembershipCollectPaymentPath(m, returnTo),
                disabledReason: (m) => standingFromUserMembership(m).collect.reason,
                onClick: (m) => {
                  const path = getMembershipCollectPaymentPath(m, returnTo)
                  if (path) navigate(path)
                },
              },
              {
                id: 'renew',
                label: RENEW_MEMBERSHIP_LABEL,
                disabled: (m) => !standingFromUserMembership(m).renew.allowed,
                disabledReason: (m) => standingFromUserMembership(m).renew.reason,
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
