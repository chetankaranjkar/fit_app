import { api } from '../lib/api'

export type MembershipAuditAction =
  | 'Created'
  | 'Updated'
  | 'Renewed'
  | 'RenewalReverted'
  | 'CancelRequested'
  | 'CancelApproved'
  | 'VoidRequested'
  | 'VoidApproved'
  | 'VoidRejected'
  | 'FeeChanged'
  | 'PlanChanged'
  | 'DateChanged'
  | 'StatusChanged'
  | 'TransferRequested'
  | 'TransferApproved'

export interface MembershipAuditLog {
  id: number
  membershipId: number
  action: MembershipAuditAction | string
  oldValue?: string | null
  newValue?: string | null
  performedByUserId: number
  performedByName?: string | null
  performedDate: string
  ipAddress?: string | null
  deviceInfo?: string | null
}

function normalizeLog(raw: Record<string, unknown>): MembershipAuditLog {
  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    membershipId: Number(raw.membershipId ?? raw.MembershipId ?? 0),
    action: String(raw.action ?? raw.Action ?? ''),
    oldValue: (raw.oldValue ?? raw.OldValue) as string | null | undefined,
    newValue: (raw.newValue ?? raw.NewValue) as string | null | undefined,
    performedByUserId: Number(raw.performedByUserId ?? raw.PerformedByUserId ?? 0),
    performedByName: (raw.performedByName ?? raw.PerformedByName) as string | null | undefined,
    performedDate: String(raw.performedDate ?? raw.PerformedDate ?? ''),
    ipAddress: (raw.ipAddress ?? raw.IPAddress) as string | null | undefined,
    deviceInfo: (raw.deviceInfo ?? raw.DeviceInfo) as string | null | undefined,
  }
}

export const membershipAuditService = {
  list: async (params?: { membershipId?: number; userId?: number }) => {
    const query = new URLSearchParams()
    if (params?.membershipId) query.set('membershipId', String(params.membershipId))
    if (params?.userId) query.set('userId', String(params.userId))
    const qs = query.toString()
    const { data } = await api.get<unknown[]>(`/membership-audit${qs ? `?${qs}` : ''}`)
    return Array.isArray(data)
      ? data.map((row) => normalizeLog(row as Record<string, unknown>))
      : []
  },
}
