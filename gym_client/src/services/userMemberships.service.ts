import { api } from '../lib/api'
import type { ActiveMembershipConflict } from '../types/activeMembershipConflict'
import type {
  UserMembership,
  CreateUserMembershipDto,
  LastRenewalRevertPreview,
  PagedUserMembershipsResponse,
  PagedExpiringMembershipQueueResponse,
  ExpiringMembershipQueueItem,
  UpdateUserMembershipDto,
  MembershipStatus,
  UserMembershipSummary,
} from '../types/userMembership'

const MEMBERSHIP_STATUS_VALUES: MembershipStatus[] = [
  'Active',
  'Expired',
  'Paused',
  'Frozen',
  'Cancelled',
  'Pending',
  'ActivePendingPayment',
  'PartialPayment',
  'VoidPending',
  'Voided',
  'Transferred',
]

function normalizeMembershipStatus(raw: unknown): MembershipStatus {
  const s = String(raw ?? '').trim()
  if (MEMBERSHIP_STATUS_VALUES.includes(s as MembershipStatus)) return s as MembershipStatus
  return 'Active'
}

export function normalizeUserMembership(raw: Record<string, unknown>): UserMembership {
  const pendingAmount = Number(raw.pendingAmount ?? raw.PendingAmount ?? 0)
  const paymentStatus = (raw.paymentStatus ?? raw.PaymentStatus ?? null) as string | null
  const isFullyPaidRaw = raw.isFullyPaid ?? raw.IsFullyPaid
  const isFullyPaid =
    typeof isFullyPaidRaw === 'boolean'
      ? isFullyPaidRaw
      : paymentStatus?.toLowerCase() === 'paid' || pendingAmount <= 0.02
  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    userId: Number(raw.userId ?? raw.UserId ?? 0),
    planId: Number(raw.planId ?? raw.PlanId ?? 0),
    startDate: String(raw.startDate ?? raw.StartDate ?? ''),
    endDate: String(raw.endDate ?? raw.EndDate ?? ''),
    status: normalizeMembershipStatus(raw.status ?? raw.Status),
    userName: (raw.userName ?? raw.UserName ?? null) as string | null,
    planName: (raw.planName ?? raw.PlanName ?? null) as string | null,
    memberPhone: (raw.memberPhone ?? raw.MemberPhone ?? null) as string | null,
    daysRemaining: Number(raw.daysRemaining ?? raw.DaysRemaining ?? 0),
    isExpired: Boolean(raw.isExpired ?? raw.IsExpired ?? false),
    membershipPaymentId: Number(raw.membershipPaymentId ?? raw.MembershipPaymentId ?? 0) || null,
    pendingAmount,
    paymentStatus,
    isFullyPaid,
    hasCompletedPayments: Boolean(raw.hasCompletedPayments ?? raw.HasCompletedPayments ?? false),
  }
}

function normalizeUserMembershipSummary(raw: Record<string, unknown>) {
  return {
    total: Number(raw.total ?? raw.Total ?? 0),
    active: Number(raw.active ?? raw.Active ?? 0),
    paymentDue: Number(raw.paymentDue ?? raw.PaymentDue ?? 0),
    expiring14d: Number(raw.expiring14d ?? raw.Expiring14d ?? 0),
    voidPending: Number(raw.voidPending ?? raw.VoidPending ?? 0),
    expired: Number(raw.expired ?? raw.Expired ?? 0),
  }
}

/** Parse API payload for GET /UserMemberships/by-user/{userId}. */
export function parseUserMembershipList(data: unknown): UserMembership[] {
  if (Array.isArray(data)) {
    return data
      .map((row) => normalizeUserMembership(row as Record<string, unknown>))
      .filter((m) => m.id > 0)
  }
  if (data && typeof data === 'object') {
    const wrapped = data as { items?: unknown; Items?: unknown; data?: unknown; Data?: unknown }
    for (const candidate of [wrapped.items, wrapped.Items, wrapped.data, wrapped.Data]) {
      if (Array.isArray(candidate)) return parseUserMembershipList(candidate)
    }
  }
  return []
}

export const userMembershipsByUserQueryKey = (userId: number) =>
  ['user-memberships', 'by-user', userId] as const

function normalizeExpiringQueueItem(raw: Record<string, unknown>): ExpiringMembershipQueueItem {
  const pendingAmount = Number(raw.pendingAmount ?? raw.PendingAmount ?? 0)
  const paymentStatus = (raw.paymentStatus ?? raw.PaymentStatus ?? null) as string | null
  const isFullyPaidRaw = raw.isFullyPaid ?? raw.IsFullyPaid
  const isFullyPaid =
    typeof isFullyPaidRaw === 'boolean'
      ? isFullyPaidRaw
      : paymentStatus?.toLowerCase() === 'paid' || pendingAmount <= 0.02
  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    userId: Number(raw.userId ?? raw.UserId ?? 0),
    planId: Number(raw.planId ?? raw.PlanId ?? 0),
    startDate: String(raw.startDate ?? raw.StartDate ?? ''),
    endDate: String(raw.endDate ?? raw.EndDate ?? ''),
    status: normalizeMembershipStatus(raw.status ?? raw.Status),
    userName: (raw.userName ?? raw.UserName ?? null) as string | null,
    memberPhone: (raw.memberPhone ?? raw.MemberPhone ?? null) as string | null,
    planName: (raw.planName ?? raw.PlanName ?? null) as string | null,
    daysRemaining: Number(raw.daysRemaining ?? raw.DaysRemaining ?? 0),
    isExpired: Boolean(raw.isExpired ?? raw.IsExpired ?? false),
    membershipPaymentId: Number(raw.membershipPaymentId ?? raw.MembershipPaymentId ?? 0) || null,
    pendingAmount,
    paymentStatus,
    isFullyPaid,
  }
}

/** Shared loader for member profile, users list modal, and conflict checks. */
export async function listMembershipsForUser(userId: number): Promise<UserMembership[]> {
  const { data } = await api.get<unknown>(`/UserMemberships/by-user/${userId}`)
  return parseUserMembershipList(data)
}

export const userMembershipsService = {
  getAll: () => api.get<UserMembership[]>('/UserMemberships'),
  getExpiringQueue: async (params: {
    withinDays?: number
    page?: number
    pageSize?: number
    search?: string
  }) => {
    const query = new URLSearchParams()
    query.set('withinDays', String(params.withinDays ?? 14))
    query.set('page', String(params.page ?? 1))
    query.set('pageSize', String(params.pageSize ?? 20))
    if (params.search?.trim()) query.set('search', params.search.trim())
    const { data } = await api.get<unknown>(`/UserMemberships/expiring-queue?${query.toString()}`)
    const payload = data as Record<string, unknown>
    const rawItems = (payload.items ?? payload.Items ?? []) as unknown[]
    const items = rawItems
      .map((row) => normalizeExpiringQueueItem(row as Record<string, unknown>))
      .filter((m) => m.id > 0)
    return {
      items,
      totalCount: Number(payload.totalCount ?? payload.TotalCount ?? items.length),
      page: Number(payload.page ?? payload.Page ?? 1),
      pageSize: Number(payload.pageSize ?? payload.PageSize ?? 20),
    } satisfies PagedExpiringMembershipQueueResponse
  },
  getPaged: async (params: {
    page: number
    pageSize: number
    search?: string
    status?: string
    needsPayment?: boolean
    expiringWithinDays?: number
    includeTerminal?: boolean
    membershipId?: number
  }) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.needsPayment) query.set('needsPayment', 'true')
    if (params.expiringWithinDays != null && params.expiringWithinDays > 0) {
      query.set('expiringWithinDays', String(params.expiringWithinDays))
    }
    if (params.includeTerminal) query.set('includeTerminal', 'true')
    if (params.membershipId != null && params.membershipId > 0) {
      query.set('membershipId', String(params.membershipId))
    }
    const { data } = await api.get<unknown>(`/UserMemberships/paged?${query.toString()}`)
    const payload = data as Record<string, unknown>
    const rawItems = (payload.items ?? payload.Items ?? []) as unknown[]
    const items = rawItems
      .map((row) => normalizeUserMembership(row as Record<string, unknown>))
      .filter((m) => m.id > 0)
    return {
      items,
      totalCount: Number(payload.totalCount ?? payload.TotalCount ?? items.length),
      page: Number(payload.page ?? payload.Page ?? params.page),
      pageSize: Number(payload.pageSize ?? payload.PageSize ?? params.pageSize),
    } satisfies PagedUserMembershipsResponse
  },
  getSummary: async () => {
    const { data } = await api.get<unknown>('/UserMemberships/summary')
    return normalizeUserMembershipSummary((data ?? {}) as Record<string, unknown>) satisfies UserMembershipSummary
  },
  getByUserId: async (userId: number) => {
    const res = await api.get<unknown>(`/UserMemberships/by-user/${userId}`)
    return { ...res, data: parseUserMembershipList(res.data) }
  },
  /** @alias getByUserId */
  getByUser: (userId: number) => userMembershipsService.getByUserId(userId),
  listForUser: listMembershipsForUser,
  getActiveConflict: (userId: number, excludeMembershipId?: number) =>
    api.get<ActiveMembershipConflict>(`/UserMemberships/active-conflict/${userId}`, {
      params: excludeMembershipId ? { excludeMembershipId } : {},
      validateStatus: (s) => s === 200 || s === 404,
    }),
  getById: async (id: number) => {
    const res = await api.get<unknown>(`/UserMemberships/${id}`)
    return {
      ...res,
      data: normalizeUserMembership((res.data ?? {}) as Record<string, unknown>),
    }
  },
  renewAccess: async (id: number, body?: { planId?: number }) => {
    const res = await api.post<unknown>(`/UserMemberships/${id}/renew-access`, body ?? {})
    return {
      ...res,
      data: normalizeUserMembership((res.data ?? {}) as Record<string, unknown>),
    }
  },
  getLastRenewalRevertPreview: async (id: number): Promise<LastRenewalRevertPreview | null> => {
    const res = await api.get<unknown>(`/UserMemberships/${id}/last-renewal-revert-preview`, {
      validateStatus: (s) => s === 200 || s === 404,
    })
    if (res.status === 404 || !res.data) return null
    const raw = res.data as Record<string, unknown>
    return {
      membershipId: Number(raw.membershipId ?? raw.MembershipId ?? id),
      currentPlanId: Number(raw.currentPlanId ?? raw.CurrentPlanId ?? 0),
      currentPlanName: (raw.currentPlanName ?? raw.CurrentPlanName ?? null) as string | null,
      currentEndDate: String(raw.currentEndDate ?? raw.CurrentEndDate ?? ''),
      previousPlanId: Number(raw.previousPlanId ?? raw.PreviousPlanId ?? 0),
      previousPlanName: (raw.previousPlanName ?? raw.PreviousPlanName ?? null) as string | null,
      previousStartDate: String(raw.previousStartDate ?? raw.PreviousStartDate ?? ''),
      previousEndDate: String(raw.previousEndDate ?? raw.PreviousEndDate ?? ''),
      previousStatus: String(raw.previousStatus ?? raw.PreviousStatus ?? 'Active'),
      lastRenewedAt: String(raw.lastRenewedAt ?? raw.LastRenewedAt ?? ''),
      lastRenewedByName: (raw.lastRenewedByName ?? raw.LastRenewedByName ?? null) as string | null,
    }
  },
  revertLastRenewal: async (id: number) => {
    const res = await api.post<unknown>(`/UserMemberships/${id}/revert-last-renewal`, {})
    return {
      ...res,
      data: normalizeUserMembership((res.data ?? {}) as Record<string, unknown>),
    }
  },
  create: (data: CreateUserMembershipDto) =>
    api.post<UserMembership>('/UserMemberships', data),
  update: (id: number, data: UpdateUserMembershipDto) =>
    api.put<UserMembership>(`/UserMemberships/${id}`, data),
  /** Disabled server-side — use membershipApprovalRequestsService.create void request. */
  delete: (id: number) => api.delete(`/UserMemberships/${id}`),
}
