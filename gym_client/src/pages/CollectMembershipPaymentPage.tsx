import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardPageContent } from '../components/layout/DataPageShell'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { membershipPaymentsService } from '../services/membershipPayments.service'
import { waiveOffRequestsService } from '../services/waiveOffRequests.service'
import { couponsService } from '../services/coupons.service'
import { formatInr } from '../lib/formatInr'
import { getApiErrorMessage } from '../lib/apiErrors'
import { invalidateDashboardQueries } from '../lib/dashboardQueryKeys'
import { BillingSummaryCard } from '../components/billing/BillingSummaryCard'
import { MembershipFinancialSummaryCard } from '../components/billing/MembershipFinancialSummaryCard'
import { PaymentConfirmationModal } from '../components/billing/PaymentConfirmationModal'
import { PaymentReceiptModal, type PaymentReceiptData } from '../components/billing/PaymentReceiptModal'
import { PaymentCollectedPanel } from '../components/billing/PaymentCollectedPanel'
import {
  MEMBERSHIP_PAYMENT_METHODS,
  computeNetPayable,
  findRecordedTransaction,
  getMembershipAmount,
  getRemainingBalance,
  paymentMethodLabel,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from '../components/billing/membershipPaymentUi'
import { memberMembershipHistoryPath, resolvePostCollectPaymentPath } from '../lib/membershipPaymentNavigation'
import { RENEW_MEMBERSHIP_LABEL, deriveMembershipStanding } from '../lib/membershipStanding'
import { MembershipStandingPanel } from '../components/memberships/MembershipStandingPanel'
import { membershipToConflict } from '../lib/activeMembershipConflict'
import { extendMembershipAccessRenewal } from '../lib/membershipRenewFlow'
import { userMembershipsService } from '../services/userMemberships.service'
import type { MembershipPaymentMethod } from '../types/membershipPayment'
import type { ValidateCouponResponse } from '../types/coupon'
import { usePermission } from '../features/auth/hooks/usePermission'
import { authService } from '../services/auth.service'

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

export function CollectMembershipPaymentPage() {
  const { userName } = getDashboardUser()
  const canPay = usePermission(authService.permissionCodes.payments)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const membershipId = Number(params.get('membershipId') || '0')
  const userIdFromUrl = Number(params.get('userId') || '0')
  const returnToParam = params.get('returnTo')
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<MembershipPaymentMethod>('Upi')
  const [reference, setReference] = useState('')
  const [nextDue, setNextDue] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponse | null>(null)
  const [selectedCouponCode, setSelectedCouponCode] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [duplicateWarn, setDuplicateWarn] = useState<string | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [collected, setCollected] = useState<{
    receipt: PaymentReceiptData
    fullySettled: boolean
    redirectPath: string | null
  } | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const submittingRef = useRef(false)
  const [waiveOpen, setWaiveOpen] = useState(false)
  const [waiveAmount, setWaiveAmount] = useState('')
  const [waiveReason, setWaiveReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['membership-payment', membershipId],
    queryFn: async () => {
      const { data: d } = await membershipPaymentsService.byMembership(membershipId)
      return d
    },
    enabled: membershipId > 0 && canPay,
  })

  const { data: membership } = useQuery({
    queryKey: ['user-membership', membershipId],
    queryFn: async () => {
      const { data: d } = await userMembershipsService.getById(membershipId)
      return d
    },
    enabled: membershipId > 0 && canPay,
  })

  const { data: financialSummary } = useQuery({
    queryKey: ['membership-financial-summary', membershipId],
    queryFn: async () => {
      const { data: d } = await membershipPaymentsService.financialSummary(membershipId)
      return d
    },
    enabled: membershipId > 0 && canPay,
  })

  const { data: activeCoupons = [] } = useQuery({
    queryKey: ['coupons-active-collect'],
    queryFn: async () => {
      const { data: d } = await couponsService.getAll({ status: 'Active' })
      return d
    },
    enabled: canPay,
  })

  const net = useMemo(() => {
    if (!data) return 0
    return computeNetPayable(
      data.totalAmount,
      data.discountAmount,
      data.waiverAmount,
      data.netPayableAmount,
      data.finalBillAmount,
      data.couponDiscountAmount ?? 0,
    )
  }, [data])

  const paidNum = Number(amount) || 0
  const remainingBeforePay = useMemo(() => {
    if (!data) return 0
    return getRemainingBalance(data)
  }, [data])

  /** Live totals from payment record (stays in sync after coupon apply). */
  const summaryForCard = useMemo(() => {
    if (!data) return null
    const membershipFee = getMembershipAmount(data)
    const couponDiscount = data.couponDiscountAmount ?? 0
    const approvedWaiveOff = data.waiverAmount ?? 0
    const netPayableAmount = computeNetPayable(
      data.totalAmount,
      data.discountAmount,
      data.waiverAmount,
      data.netPayableAmount,
      data.finalBillAmount,
      couponDiscount,
    )
    return {
      membershipFee,
      couponDiscount,
      approvedWaiveOff,
      netPayableAmount,
      totalPaid: data.paidAmount,
      outstandingBalance: remainingBeforePay,
      isOverdue: data.paymentStatus === 'Overdue',
      planName: data.planName,
      userId: data.userId,
      memberName: financialSummary?.memberName ?? null,
      memberPhotoUrl: financialSummary?.memberPhotoUrl ?? null,
      memberCode: financialSummary?.memberCode ?? null,
    }
  }, [data, financialSummary, remainingBeforePay])

  const pendingAfter = useMemo(() => {
    if (!data) return 0
    return Math.max(0, remainingBeforePay - paidNum)
  }, [data, remainingBeforePay, paidNum])

  const fullyPaid = remainingBeforePay <= 0.02
  const memberUserId = userIdFromUrl || data?.userId || 0
  const backPath = resolvePostCollectPaymentPath(memberUserId, returnToParam)
  const standing = deriveMembershipStanding({
    status: membership?.status ?? data?.membershipStatus,
    planName: membership?.planName ?? data?.planName,
    startDate: membership?.startDate,
    endDate: membership?.endDate,
    outstanding: data ? remainingBeforePay : null,
    billingStatus: data?.paymentStatus,
  })

  const extendAccessMutation = useMutation({
    mutationFn: async () => {
      const { data: membership } = await userMembershipsService.getById(membershipId)
      if (!membership?.id) throw new Error('Membership not found.')
      const result = await extendMembershipAccessRenewal(membershipToConflict(membership))
      if (!result.ok) {
        throw new Error(
          result.message ??
            (result.reason === 'needs_collect'
              ? 'Collect outstanding payment before extending access.'
              : 'Could not extend membership access.'),
        )
      }
      return result.endDate
    },
    onSuccess: (endDate) => {
      toast.success(`Membership renewed until ${new Date(endDate + 'T12:00:00').toLocaleDateString()}.`)
      queryClient.invalidateQueries({ queryKey: ['membership-payment', membershipId] })
      queryClient.invalidateQueries({ queryKey: ['user-membership', membershipId] })
      queryClient.invalidateQueries({ queryKey: ['membership-financial-summary', membershipId] })
      invalidateDashboardQueries(queryClient)
      if (backPath) navigate(backPath, { replace: true })
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not extend membership')),
  })

  const applyCouponMutation = useMutation({
    mutationFn: async (couponCode: string) => {
      if (!data) throw new Error('No billing')
      const { data: res } = await membershipPaymentsService.applyCoupon(data.id, couponCode)
      return res
    },
    onSuccess: (res) => {
      queryClient.setQueryData(['membership-payment', membershipId], res)
      queryClient.invalidateQueries({ queryKey: ['membership-financial-summary', membershipId] })
      const due = getRemainingBalance(res)
      setAmount(String(Math.round(due * 100) / 100))
      setAppliedCoupon({
        valid: true,
        discountAmount: res.couponDiscountAmount ?? 0,
        finalAmount: res.finalBillAmount ?? res.netPayableAmount ?? due,
        message: 'Coupon locked to invoice',
        couponCode: res.couponCode,
        couponId: res.couponId,
      })
      toast.success(`Coupon applied — pay ${formatInr(due)}`)
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Failed to apply coupon')),
  })

  const installmentKind =
    paidNum > 0 && pendingAfter <= 0.02 ? 'full' : paidNum > 0 && pendingAfter > 0.02 ? 'partial' : null

  const exceedsOutstanding = paidNum > 0 && paidNum - remainingBeforePay > 0.02

  const waiveMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('No billing')
      const { data: res } = await waiveOffRequestsService.create({
        membershipPaymentId: data.id,
        requestedAmount: Number(waiveAmount),
        reason: waiveReason.trim(),
      })
      return res
    },
    onSuccess: () => {
      toast.success('Waive-off request submitted for admin approval')
      setWaiveOpen(false)
      setWaiveAmount('')
      setWaiveReason('')
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not submit waive-off request')),
  })

  const runDuplicateCheck = async (paymentId: number, amountToCheck: number) => {
    try {
      const { data: dup } = await membershipPaymentsService.checkDuplicate(paymentId, amountToCheck)
      setDuplicateWarn(
        dup.isDuplicate ? (dup.message ?? 'Similar payment detected. Please verify before continuing.') : null,
      )
    } catch {
      setDuplicateWarn(null)
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('No data')
      if (exceedsOutstanding) {
        throw new Error('Payment amount cannot exceed outstanding balance.')
      }
      const priorTransactionIds = new Set(data.transactions.map((t) => t.id))
      const body = {
        amount: paidNum,
        method,
        referenceNumber: reference.trim() || undefined,
        transactionDate: new Date().toISOString(),
        nextDueDate:
          pendingAfter > 0.02 ? (nextDue ? new Date(`${nextDue}T12:00:00`).toISOString() : undefined) : undefined,
      }
      const { data: res } = await membershipPaymentsService.addInstallment(data.id, body)
      const recorded = findRecordedTransaction(res.transactions ?? [], priorTransactionIds)
      let prefs: { email?: boolean; sms?: boolean } = {}
      if (recorded) {
        // The receipt's "Enable email/SMS" action rewrites both flags, so it needs the member's real preferences.
        try {
          const { data: rows } = await membershipPaymentsService.listTransactions({ userId: res.userId })
          const row = rows.find((r) => r.id === recorded.id)
          if (row) prefs = { email: row.receiveEmailNotifications, sms: row.receiveSmsNotifications }
        } catch {
          prefs = {}
        }
      }
      return { res, recorded, prefs }
    },
    onSuccess: ({ res, recorded, prefs }) => {
      const profileUserId =
        userIdFromUrl > 0 ? userIdFromUrl : (res.userId ?? data?.userId ?? 0)
      const redirectPath = resolvePostCollectPaymentPath(profileUserId, returnToParam)
      const fullySettled = res.paymentStatus === 'Paid' || Boolean(res.isFullyPaid)

      setConfirmOpen(false)
      setSubmitError(null)
      setFormError(null)
      setAmount('')
      setReference('')
      setNextDue('')
      setAppliedCoupon(null)
      setSelectedCouponCode('')
      setDuplicateWarn(null)

      const msg = fullySettled
        ? 'Full payment recorded. Membership is now active.'
        : res.paymentStatus === 'Partial' || res.isPartiallyPaid
          ? `Partial payment recorded. Pending ${formatInr(res.pendingAmount)}.`
          : 'Payment recorded.'
      toast.success(msg)

      if (recorded) {
        setCollected({
          fullySettled,
          redirectPath: redirectPath || null,
          receipt: {
            transactionId: recorded.id,
            userId: res.userId,
            receiptNumber: recorded.receiptNumber ?? `#${recorded.id}`,
            memberName: financialSummary?.memberName ?? membership?.userName ?? 'Member',
            memberId: financialSummary?.memberCode ?? `M-${res.userId}`,
            memberPhotoUrl: financialSummary?.memberPhotoUrl,
            planName: res.planName,
            amountPaid: recorded.transactionAmount,
            paymentMethod: recorded.transactionMethod,
            remainingBalance: res.pendingAmount,
            paymentDate: recorded.transactionDate,
            receiveEmailNotifications: prefs.email ?? false,
            receiveSmsNotifications: prefs.sms ?? false,
          },
        })
        setReceiptOpen(true)
      } else if (redirectPath) {
        navigate(redirectPath, { replace: true })
      } else {
        toast.error('Payment recorded but member profile could not be opened (missing user id).')
      }

      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['payments-paged'] })
      queryClient.invalidateQueries({ queryKey: ['payments-stats'] })
      queryClient.invalidateQueries({ queryKey: ['enterprise-billing-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['membership-payment', membershipId] })
      queryClient.invalidateQueries({ queryKey: ['user-membership', membershipId] })
      queryClient.invalidateQueries({ queryKey: ['membership-financial-summary', membershipId] })
      invalidateDashboardQueries(queryClient)
      if (profileUserId > 0) {
        queryClient.invalidateQueries({ queryKey: ['membership-payments-user', profileUserId] })
        queryClient.invalidateQueries({ queryKey: ['member-ledger', profileUserId] })
        queryClient.invalidateQueries({ queryKey: ['user', profileUserId] })
        queryClient.invalidateQueries({ queryKey: ['userProfileSummary', profileUserId] })
        queryClient.invalidateQueries({ queryKey: ['users'] })
        queryClient.invalidateQueries({ queryKey: ['user-memberships'] })
      }
    },
    onError: (e: unknown) => {
      const message = getApiErrorMessage(e, 'Failed to record payment')
      setSubmitError(message)
      toast.error(message)
      // A timed-out request may still have been saved: reload the balance and re-run the duplicate check before any retry.
      if (data) {
        void queryClient.invalidateQueries({ queryKey: ['membership-payment', membershipId] })
        void runDuplicateCheck(data.id, paidNum)
      }
    },
    onSettled: () => {
      submittingRef.current = false
    },
  })

  const localToday = new Date().toLocaleDateString('en-CA')

  const handleReview = async () => {
    if (!data || paidNum <= 0 || exceedsOutstanding || checkingDuplicate) return
    if (pendingAfter > 0.02) {
      if (!nextDue) {
        setFormError('Next due date is required for partial payments.')
        return
      }
      if (nextDue < localToday) {
        setFormError('Next due date cannot be in the past.')
        return
      }
    }
    setFormError(null)
    setSubmitError(null)
    setCheckingDuplicate(true)
    await runDuplicateCheck(data.id, paidNum)
    setCheckingDuplicate(false)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    if (submittingRef.current || mutation.isPending) return
    submittingRef.current = true
    setSubmitError(null)
    mutation.mutate()
  }

  const finishCollection = () => {
    setReceiptOpen(false)
    if (collected?.redirectPath) navigate(collected.redirectPath, { replace: true })
  }

  if (!canPay) {
    return (
      <DashboardLayout userName={userName}>
        <p className="px-6 text-slate-400">You do not have permission to collect payments.</p>
      </DashboardLayout>
    )
  }

  if (!membershipId) {
    return (
      <DashboardLayout userName={userName}>
        <p className="px-6 text-slate-400">Missing membershipId in URL.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-4xl px-4 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Billing</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Collect membership payment</h1>
        </div>

        {collected ? (
          <PaymentCollectedPanel
            receipt={collected.receipt}
            fullySettled={collected.fullySettled}
            onViewReceipt={() => setReceiptOpen(true)}
            onDone={collected.redirectPath ? finishCollection : undefined}
            doneLabel="Done"
          />
        ) : null}

        {isLoading || !data ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-md sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">{data.planName ?? 'Membership'}</h2>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(data.paymentStatus)}`}
                >
                  {paymentStatusLabel(data.paymentStatus)}
                </span>
              </div>
              <MembershipStandingPanel
                className="mt-4"
                title="Membership"
                standing={standing}
                canManage={canPay}
                showActions={false}
              />
              {summaryForCard ? (
                <MembershipFinancialSummaryCard
                  className="mt-4"
                  membershipFee={summaryForCard.membershipFee}
                  couponDiscount={summaryForCard.couponDiscount}
                  approvedWaiveOff={summaryForCard.approvedWaiveOff}
                  netPayable={summaryForCard.netPayableAmount}
                  totalPaid={summaryForCard.totalPaid}
                  outstandingBalance={summaryForCard.outstandingBalance}
                  isOverdue={summaryForCard.isOverdue}
                />
              ) : (
                <BillingSummaryCard
                  className="mt-4"
                  membershipAmount={getMembershipAmount(data)}
                  couponCode={data.couponCode}
                  couponDiscount={data.couponDiscountAmount ?? 0}
                  manualDiscount={data.discountAmount}
                  waiverAmount={data.waiverAmount}
                  finalBilling={net}
                  paidAmount={data.paidAmount}
                  pendingAmount={remainingBeforePay}
                  couponLocked={data.couponLocked}
                />
              )}
            </section>

            {!standing.collect.allowed ? (
              <section
                className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 backdrop-blur-md sm:p-6"
                data-testid="collect-blocked"
              >
                <h2 className="text-sm font-semibold text-amber-100">
                  {fullyPaid ? 'Nothing outstanding' : 'Payment cannot be recorded'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-amber-100/90">{standing.collect.reason}</p>
                {fullyPaid ? (
                  <p className="mt-2 text-sm text-amber-100/90">
                    Collecting a payment does not add gym time. Use {RENEW_MEMBERSHIP_LABEL.toLowerCase()} to
                    extend or restart access.
                  </p>
                ) : null}
                {standing.renew.reason ? (
                  <p className="mt-2 text-xs text-amber-100/70">{standing.renew.reason}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {backPath ? (
                    <Button type="button" variant="secondary" onClick={() => navigate(backPath)}>
                      Go back
                    </Button>
                  ) : null}
                  {standing.renew.allowed && standing.renew.mode === 'extend' ? (
                    <Button
                      type="button"
                      onClick={() => extendAccessMutation.mutate()}
                      disabled={extendAccessMutation.isPending}
                      isLoading={extendAccessMutation.isPending}
                    >
                      {RENEW_MEMBERSHIP_LABEL}
                    </Button>
                  ) : standing.renew.allowed && memberUserId > 0 ? (
                    <Button type="button" onClick={() => navigate(memberMembershipHistoryPath(memberUserId))}>
                      {standing.renew.label}
                    </Button>
                  ) : null}
                </div>
              </section>
            ) : (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Record payment</h2>
                <Button type="button" variant="secondary" className="!py-1.5 text-xs" onClick={() => setWaiveOpen(true)}>
                  Request waive-off
                </Button>
              </div>
              {installmentKind && (
                <p
                  className={`mt-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                    installmentKind === 'full'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  {installmentKind === 'full'
                    ? 'This entry will fully settle the balance (full payment).'
                    : 'This entry is a partial installment — next due date is required.'}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(remainingBeforePay * 0.25 * 100) / 100))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(remainingBeforePay * 0.5 * 100) / 100))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(remainingBeforePay * 100) / 100))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Full amount
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input label="Amount (₹)" type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Discount — Apply Coupon</label>
                  <select
                    value={selectedCouponCode}
                    disabled={data.couponLocked || data.paidAmount > 0 || applyCouponMutation.isPending}
                    onChange={(e) => {
                      const code = e.target.value
                      setSelectedCouponCode(code)
                      setAppliedCoupon(null)
                      if (code) {
                        couponsService
                          .validate({
                            couponCode: code,
                            membershipPlanId: 0,
                            invoiceAmount: getMembershipAmount(data),
                            userId: data.userId,
                            membershipPaymentId: data.id,
                          })
                          .then(({ data: res }) => {
                            if (!res.valid) {
                              setAppliedCoupon(res)
                              return
                            }
                            applyCouponMutation.mutate(code)
                          })
                          .catch((err: unknown) => {
                            setAppliedCoupon({
                              valid: false,
                              discountAmount: 0,
                              finalAmount: 0,
                              message: getApiErrorMessage(err, 'Validation failed'),
                            })
                          })
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                  >
                    <option value="" className="bg-slate-900">No discount</option>
                    {activeCoupons.map((c) => (
                      <option key={c.id} value={c.couponCode} className="bg-slate-900">
                        {c.couponCode} — {c.discountType === 'Percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        {c.maximumDiscountAmount ? ` (max ₹${c.maximumDiscountAmount})` : ''}
                        {' · '}{c.couponName}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Other fee reductions need an admin-approved waive-off request.
                  </p>
                  {selectedCouponCode && appliedCoupon && (
                    <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                      appliedCoupon.valid
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                    }`}>
                      {appliedCoupon.valid ? (
                        <>
                          <p className="font-semibold">✓ Coupon applied — Discount: {formatInr(appliedCoupon.discountAmount)}</p>
                          <p className="mt-1 text-slate-300">
                            Amount to pay now:{' '}
                            <span className="text-base font-bold text-white">{formatInr(remainingBeforePay)}</span>
                          </p>
                        </>
                      ) : (
                        <p>✗ {appliedCoupon.message}</p>
                      )}
                    </div>
                  )}
                </div>
                {data.couponLocked && (data.couponDiscountAmount ?? 0) > 0 && (
                  <div className="sm:col-span-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                      Payable after coupon
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-100">
                      {formatInr(remainingBeforePay)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatInr(getMembershipAmount(data))} membership fee − {formatInr(data.couponDiscountAmount ?? 0)} coupon
                      {data.paidAmount > 0 ? ` − ${formatInr(data.paidAmount)} already paid` : ''}
                    </p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as MembershipPaymentMethod)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                  >
                    {MEMBERSHIP_PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m} className="bg-slate-900">
                        {paymentMethodLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label="Reference / txn id" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>

              {pendingAfter > 0.02 && (
                <div className="mt-3">
                  <Input
                    label="Next due date (required for partial)"
                    type="date"
                    min={localToday}
                    value={nextDue}
                    onChange={(e) => {
                      setNextDue(e.target.value)
                      setFormError(null)
                    }}
                  />
                </div>
              )}
              {exceedsOutstanding && (
                <p className="mt-3 text-sm text-rose-300">Payment amount cannot exceed outstanding balance.</p>
              )}
              {formError && (
                <p className="mt-3 text-sm text-rose-300" role="alert" data-testid="collect-form-error">
                  {formError}
                </p>
              )}
              {duplicateWarn && (
                <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {duplicateWarn}
                </p>
              )}
              <p className="mt-3 text-xs text-slate-400">
                Outstanding now {formatInr(remainingBeforePay)} · paying {formatInr(paidNum)} · balance after{' '}
                <span data-testid="collect-balance-after">{formatInr(pendingAfter)}</span>
              </p>
              <div className="sticky bottom-0 z-[1] -mx-5 mt-4 flex justify-end border-t border-white/5 bg-[rgba(11,11,26,0.96)] px-5 py-3 sm:-mx-6 sm:px-6">
                <Button
                  type="button"
                  onClick={() => void handleReview()}
                  disabled={mutation.isPending || checkingDuplicate || paidNum <= 0 || exceedsOutstanding}
                  className="min-h-11 w-full sm:w-auto"
                >
                  Review &amp; pay
                </Button>
              </div>
            </section>
            )}

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
              <h2 className="text-sm font-semibold text-white">Timeline</h2>
              <ul className="mt-3 space-y-3 text-sm text-slate-300">
                {(data.timeline?.length ? data.timeline : []).map((ev, i) => (
                  <li key={`${ev.eventType}-${i}`} className="border-l-2 border-blue-500/40 pl-3">
                    <p className="text-xs text-slate-500">{new Date(ev.occurredAt).toLocaleString()}</p>
                    <p className="font-medium text-white">{ev.label ?? ev.eventType}</p>
                    {ev.discountAmount != null && ev.discountAmount > 0 && (
                      <p className="text-emerald-300">Discount: {formatInr(ev.discountAmount)}</p>
                    )}
                    {ev.amount != null && ev.amount > 0 && (
                      <p className="text-blue-200">Amount: {formatInr(ev.amount)}</p>
                    )}
                  </li>
                ))}
                {(!data.timeline || data.timeline.length === 0) &&
                  data.transactions.map((t) => (
                    <li key={t.id} className="border-l-2 border-white/20 pl-3 py-1">
                      <p className="text-xs text-slate-500">{new Date(t.transactionDate).toLocaleString()}</p>
                      <p className="font-medium text-white">Payment: {formatInr(t.transactionAmount)}</p>
                      <p className="text-slate-500">{t.transactionMethod}</p>
                    </li>
                  ))}
                {data.transactions.length === 0 && !data.timeline?.length && (
                  <li className="text-slate-500">No activity yet.</li>
                )}
              </ul>
            </section>
          </>
        )}

        {summaryForCard && (
          <PaymentConfirmationModal
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirm}
            confirming={mutation.isPending}
            memberName={summaryForCard.memberName ?? membership?.userName ?? 'Member'}
            memberId={summaryForCard.memberCode ?? `M-${summaryForCard.userId ?? data?.userId}`}
            memberPhone={membership?.memberPhone}
            memberPhotoUrl={summaryForCard.memberPhotoUrl}
            planName={data?.planName}
            periodStart={membership?.startDate}
            periodEnd={membership?.endDate}
            summary={summaryForCard}
            paymentAmount={paidNum}
            method={method}
            referenceNumber={reference}
            nextDueDate={pendingAfter > 0.02 ? nextDue || null : null}
            duplicateWarning={duplicateWarn}
            error={submitError}
          />
        )}

        <PaymentReceiptModal
          open={receiptOpen && collected != null}
          onClose={() => setReceiptOpen(false)}
          receipt={collected?.receipt ?? null}
          onNotificationPrefsChange={(prefs) =>
            setCollected((c) =>
              c
                ? {
                    ...c,
                    receipt: { ...c.receipt, receiveEmailNotifications: prefs.email, receiveSmsNotifications: prefs.sms },
                  }
                : c,
            )
          }
        />

        <Modal open={waiveOpen} onClose={() => setWaiveOpen(false)} title="Request waive-off">
          <p className="mb-3 text-sm text-slate-400">
            Waive-off is an admin-approved fee reduction (not a marketing coupon). Pending requests appear under Payments → Waive-off requests.
          </p>
          <div className="space-y-3">
            <Input label="Requested amount (₹)" type="number" value={waiveAmount} onChange={(e) => setWaiveAmount(e.target.value)} />
            <Input label="Reason" value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWaiveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => waiveMutation.mutate()}
              disabled={waiveMutation.isPending || !waiveAmount || !waiveReason.trim()}
            >
              Submit request
            </Button>
          </div>
        </Modal>
      </DashboardPageContent>
    </DashboardLayout>
  )
}
