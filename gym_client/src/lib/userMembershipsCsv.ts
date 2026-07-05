import { downloadCsv } from './billingReportCsv'
import type { UserMembership } from '../types/userMembership'

function escapeCsv(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value)
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function userMembershipsToCsv(rows: UserMembership[]): string {
  const header = [
    'MembershipId',
    'Member',
    'Phone',
    'Plan',
    'StartDate',
    'EndDate',
    'DaysRemaining',
    'Status',
    'PaymentStatus',
    'PendingAmount',
    'IsFullyPaid',
  ]
  const body = rows.map((row) => [
    row.id,
    row.userName ?? `User #${row.userId}`,
    row.memberPhone ?? '',
    row.planName ?? `Plan #${row.planId}`,
    row.startDate.slice(0, 10),
    row.endDate.slice(0, 10),
    row.daysRemaining ?? '',
    row.status,
    row.paymentStatus ?? '',
    row.pendingAmount ?? 0,
    row.isFullyPaid ? 'Yes' : 'No',
  ])
  return [header, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n')
}

export function downloadUserMembershipsCsv(rows: UserMembership[], fileName?: string) {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(userMembershipsToCsv(rows), fileName ?? `member-plans-${stamp}.csv`)
}
