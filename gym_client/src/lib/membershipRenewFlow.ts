import type { AxiosError } from 'axios'
import { membershipPaymentsService } from '../services/membershipPayments.service'
import { membershipPlansService } from '../services/membershipPlans.service'
import { userMembershipsService } from '../services/userMemberships.service'
import { getApiErrorMessage } from './apiErrors'
import { addDaysToIsoDate } from './membershipFormUtils'
import {
  conflictCollectPaymentPath,
  conflictNeedsCollectPayment,
} from './membershipPaymentNavigation'
import type { ActiveMembershipConflict } from '../types/activeMembershipConflict'
import type { CreateUserMembershipDto, UserMembership } from '../types/userMembership'

export { conflictNeedsCollectPayment, conflictCollectPaymentPath }

export type ExtendMembershipRenewalResult =
  | { ok: true; endDate: string }
  | {
      ok: false
      reason: 'needs_collect' | 'needs_approval' | 'error'
      message?: string
    }

export type RenewExtensionRequestPayload = {
  membership: UserMembership
  form: CreateUserMembershipDto
  extendedEndDate: string
}

const NEEDS_APPROVAL_MESSAGE =
  'This membership has payment records. Submit an admin approval request to extend the end date.'

function classifyRenewAccessError(message: string): ExtendMembershipRenewalResult {
  const lower = message.toLowerCase()
  if (/payment records/.test(lower)) {
    return { ok: false, reason: 'needs_approval', message }
  }
  if (/collect|outstanding payment|payment before/.test(lower)) {
    return { ok: false, reason: 'needs_collect', message }
  }
  return { ok: false, reason: 'error', message }
}

function resolvePlanDurationDays(plans: unknown[], planId: number): number {
  const plan = plans.find((raw) => {
    const p = raw as { id?: number; Id?: number; durationDays?: number; DurationDays?: number }
    return (p.id ?? p.Id) === planId
  }) as { durationDays?: number; DurationDays?: number } | undefined
  return Number(plan?.durationDays ?? plan?.DurationDays ?? 0)
}

function membershipIndicatesPaymentRecords(membership: UserMembership): boolean {
  if (membership.hasCompletedPayments) return true
  if (membership.membershipPaymentId) return true
  if ((membership.pendingAmount ?? 0) > 0.02) return true

  const paymentStatus = membership.paymentStatus?.trim().toLowerCase()
  if (
    paymentStatus &&
    paymentStatus !== 'unpaid' &&
    paymentStatus !== 'pending' &&
    paymentStatus !== 'none'
  ) {
    return true
  }

  return false
}

export async function membershipHasPaymentRecords(membershipId: number): Promise<boolean> {
  try {
    const { data: membership } = await userMembershipsService.getById(membershipId)
    if (!membership?.id) return false
    if (membershipIndicatesPaymentRecords(membership)) return true

    try {
      const billingRes = await membershipPaymentsService.byMembership(membershipId)
      const billing = billingRes.data as { id?: number; Id?: number; paidAmount?: number; PaidAmount?: number } | null
      if (billingRes.status === 200 && billing) {
        const billingId = Number(billing.id ?? billing.Id ?? 0)
        const paidAmount = Number(billing.paidAmount ?? billing.PaidAmount ?? 0)
        if (billingId > 0 || paidAmount > 0.02) return true
      }
    } catch {
      /* no billing row */
    }

    const { data: financial } = await membershipPaymentsService.financialSummary(membershipId)
    if (!financial) return false
    const raw = financial as Record<string, unknown>
    const totalPaid = Number(raw.totalPaid ?? raw.TotalPaid ?? 0)
    const outstanding = Number(raw.outstandingBalance ?? raw.OutstandingBalance ?? 0)
    return totalPaid > 0.02 || outstanding > 0.02
  } catch {
    return true
  }
}

export async function buildRenewExtensionRequest(
  conflict: ActiveMembershipConflict,
  planId?: number,
): Promise<RenewExtensionRequestPayload | null> {
  const { data: membership } = await userMembershipsService.getById(conflict.membershipId)
  if (!membership?.id) return null

  const resolvedPlanId = planId != null && planId > 0 ? planId : membership.planId
  const { data: plansRaw } = await membershipPlansService.getAll()
  const plans = Array.isArray(plansRaw) ? plansRaw : []
  const durationDays = resolvePlanDurationDays(plans, resolvedPlanId)
  if (durationDays <= 0) return null

  const extendedEndDate = addDaysToIsoDate(conflict.endDate.slice(0, 10), durationDays)
  return {
    membership,
    extendedEndDate,
    form: {
      userId: membership.userId,
      planId: resolvedPlanId,
      startDate: membership.startDate.slice(0, 10),
      endDate: extendedEndDate,
      status: membership.status,
    },
  }
}

async function extendViaUpdate(
  conflict: ActiveMembershipConflict,
  planId?: number,
): Promise<ExtendMembershipRenewalResult> {
  const built = await buildRenewExtensionRequest(conflict, planId)
  if (!built) {
    return { ok: false, reason: 'error', message: 'Could not resolve plan duration.' }
  }

  await userMembershipsService.update(conflict.membershipId, { endDate: built.extendedEndDate })
  return { ok: true, endDate: built.extendedEndDate }
}

export async function extendMembershipAccessRenewal(
  conflict: ActiveMembershipConflict,
  planId?: number,
): Promise<ExtendMembershipRenewalResult> {
  if (conflict.membershipId <= 0) {
    return {
      ok: false,
      reason: 'error',
      message: 'Invalid membership record. Close this dialog, refresh, and try again.',
    }
  }

  if (conflictNeedsCollectPayment(conflict)) {
    return { ok: false, reason: 'needs_collect' }
  }

  try {
    const { data } = await userMembershipsService.renewAccess(
      conflict.membershipId,
      planId != null && planId > 0 ? { planId } : undefined,
    )
    const endDate = String(
      data.endDate ?? (data as unknown as Record<string, unknown>).EndDate ?? '',
    ).slice(0, 10)
    if (!endDate) {
      return { ok: false, reason: 'error', message: 'Renewal succeeded but the new end date was missing.' }
    }
    return { ok: true, endDate }
  } catch (err) {
    const status = (err as AxiosError)?.response?.status
    if (status === 404) {
      try {
        return await extendViaUpdate(conflict, planId)
      } catch (fallbackErr) {
        return classifyRenewAccessError(getApiErrorMessage(fallbackErr, 'Failed to extend membership.'))
      }
    }
    return classifyRenewAccessError(getApiErrorMessage(err, 'Failed to extend membership.'))
  }
}
