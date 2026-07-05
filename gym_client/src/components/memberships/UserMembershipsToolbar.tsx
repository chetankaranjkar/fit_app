import { DataFilterSelect, DataToolbar } from '../data-grid'
import { membershipStatusLabel } from '../../lib/membershipFormUtils'
import type { UserMembershipQuickFilter } from '../../lib/userMembershipListUtils'
import type { MembershipStatus } from '../../types/userMembership'

const statusOptions: MembershipStatus[] = [
  'Active',
  'ActivePendingPayment',
  'PartialPayment',
  'Paused',
  'Expired',
  'VoidPending',
]

const QUICK_FILTERS: { id: UserMembershipQuickFilter; label: string }[] = [
  { id: 'all', label: 'All operational' },
  { id: 'needsPayment', label: 'Needs payment' },
  { id: 'expiring14', label: 'Expiring (14d)' },
  { id: 'voidPending', label: 'Void pending' },
  { id: 'expired', label: 'Expired' },
  { id: 'terminal', label: 'Include voided' },
]

const pillClass = (active: boolean) =>
  [
    'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition',
    active
      ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
  ].join(' ')

type UserMembershipsToolbarProps = {
  listSearch: string
  onSearchChange: (value: string) => void
  statusFilter: 'all' | MembershipStatus
  onStatusFilterChange: (value: 'all' | MembershipStatus) => void
  quickFilter: UserMembershipQuickFilter
  onQuickFilterChange: (value: UserMembershipQuickFilter) => void
}

export function UserMembershipsToolbar({
  listSearch,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  quickFilter,
  onQuickFilterChange,
}: UserMembershipsToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick membership filters">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={pillClass(quickFilter === filter.id)}
            aria-pressed={quickFilter === filter.id}
            onClick={() => onQuickFilterChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <DataToolbar
        searchValue={listSearch}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search member, phone, plan, or membership ID…"
        searchAriaLabel="Search memberships"
        filters={
          <DataFilterSelect
            value={statusFilter}
            onChange={(v) => onStatusFilterChange(v as 'all' | MembershipStatus)}
            ariaLabel="Filter by status"
            options={[
              { value: 'all', label: 'Any status' },
              ...statusOptions.map((s) => ({ value: s, label: membershipStatusLabel[s] ?? s })),
            ]}
          />
        }
      />
    </div>
  )
}
