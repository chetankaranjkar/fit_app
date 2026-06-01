import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { membershipPaymentsService } from '../services/membershipPayments.service'
import { waiveOffRequestsService } from '../services/waiveOffRequests.service'
import { couponsService } from '../services/coupons.service'
import { formatInr } from '../lib/formatInr'
import { getApiErrorMessage } from '../lib/apiErrors'
import { BillingSummaryCard } from '../components/billing/BillingSummaryCard'
import { MembershipFinancialSummaryCard } from '../components/billing/MembershipFinancialSummaryCard'
import { PaymentConfirmationModal } from '../components/billing/PaymentConfirmationModal'
import { PaymentReceiptModal, type PaymentReceiptData } from '../components/billing/PaymentReceiptModal'
import {
  MEMBERSHIP_PAYMENT_METHODS,
  computeNetPayable,
  getMembershipAmount,
  getRemainingBalance,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from '../components/billing/membershipPaymentUi'
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
  const membershipId = Number(params.get('membershipId') || '0')
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<MembershipPaymentMethod>('Upi')
  const [reference, setReference] = useState('')
  const [nextDue, setNextDue] = useState('')
  const [discount, setDiscount] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponse | null>(null)
  const [selectedCouponCode, setSelectedCouponCode] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [duplicateWarn, setDuplicateWarn] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
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

  const pendingAfter = useMemo(() => {
    if (!data) return 0
    return Math.max(0, remainingBeforePay - paidNum)
  }, [data, remainingBeforePay, paidNum])

  const applyCouponMutation = useMutation({
    mutationFn: async (couponCode: string) => {
      if (!data) throw new Error('No billing')
      const { data: res } = await membershipPaymentsService.applyCoupon(data.id, couponCode)
      return res
    },
    onSuccess: (res) => {
      queryClient.setQueryData(['membership-payment', membershipId], res)
      setAppliedCoupon({
        valid: true,
        discountAmount: res.couponDiscountAmount ?? 0,
        finalAmount: res.finalBillAmount ?? res.netPayableAmount ?? 0,
        message: 'Coupon locked to invoice',
        couponCode: res.couponCode,
        couponId: res.couponId,
      })
      toast.success('Coupon applied')
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

  const mutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('No data')
      if (exceedsOutstanding) {
        throw new Error('Payment amount cannot exceed outstanding balance.')
      }
      const body = {
        amount: paidNum,
        method,
        referenceNumber: reference.trim() || undefined,
        transactionDate: new Date().toISOString(),
        nextDueDate:
          pendingAfter > 0.02 ? (nextDue ? new Date(`${nextDue}T12:00:00`).toISOString() : undefined) : undefined,
      }
      const { data: res } = await membershipPaymentsService.addInstallment(data.id, body)
      return res
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['membership-payment', membershipId] })
      queryClient.invalidateQueries({ queryKey: ['membership-financial-summary', membershipId] })
      const msg =
        res.paymentStatus === 'Paid' || res.isFullyPaid
          ? 'Full payment recorded. Membership is now active.'
          : res.paymentStatus === 'Partial' || res.isPartiallyPaid
            ? `Partial payment recorded. Pending ${formatInr(res.pendingAmount)}.`
            : 'Payment recorded.'
      toast.success(msg)
      const lastTx = [...(res.transactions ?? [])].sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
      )[0]
      if (lastTx) {
        setReceipt({
          receiptNumber: lastTx.receiptNumber ?? `TX-${lastTx.id}`,
          memberName: financialSummary?.memberName ?? 'Member',
          memberId: financialSummary?.memberCode ?? `M-${res.userId}`,
          memberPhotoUrl: financialSummary?.memberPhotoUrl,
          planName: res.planName,
          amountPaid: lastTx.transactionAmount,
          paymentMethod: lastTx.transactionMethod,
          remainingBalance: res.pendingAmount,
          paymentDate: lastTx.transactionDate,
        })
        setReceiptOpen(true)
      }
      setConfirmOpen(false)
      setAmount('')
      setNextDue('')
      setDiscount('')
      setAppliedCoupon(null)
      setSelectedCouponCode('')
      setDuplicateWarn(null)
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Failed to record payment')),
  })

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
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Billing</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Collect membership payment</h1>
        </div>

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
              {financialSummary ? (
                <MembershipFinancialSummaryCard
                  className="mt-4"
                  membershipFee={financialSummary.membershipFee}
                  couponDiscount={financialSummary.couponDiscount}
                  approvedWaiveOff={financialSummary.approvedWaiveOff}
                  netPayable={financialSummary.netPayableAmount}
                  totalPaid={financialSummary.totalPaid}
                  outstandingBalance={financialSummary.outstandingBalance}
                  isOverdue={financialSummary.isOverdue}
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
                      setDiscount('')
                      setAppliedCoupon(null)
                      if (code && code !== '__manual__') {
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
                          .catch(() => {
                            setAppliedCoupon({ valid: false, discountAmount: 0, finalAmount: 0, message: 'Validation failed' })
                          })
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                  >
                    <option value="" className="bg-slate-900">No discount</option>
                    <option value="__manual__" className="bg-slate-900">Manual discount (₹)</option>
                    {activeCoupons.map((c) => (
                      <option key={c.id} value={c.couponCode} className="bg-slate-900">
                        {c.couponCode} — {c.discountType === 'Percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        {c.maximumDiscountAmount ? ` (max ₹${c.maximumDiscountAmount})` : ''}
                        {' · '}{c.couponName}
                      </option>
                    ))}
                  </select>
                  {selectedCouponCode === '__manual__' && (
                    <div className="mt-2">
                      <Input
                        label="Manual Discount (₹)"
                        type="number"
                        min={0}
                        step={0.01}
                        value={discount}
                        onChange={(e) => { setDiscount(e.target.value); setAppliedCoupon(null) }}
                      />
                    </div>
                  )}
                  {selectedCouponCode && selectedCouponCode !== '__manual__' && appliedCoupon && (
                    <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                      appliedCoupon.valid
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                    }`}>
                      {appliedCoupon.valid ? (
                        <p className="font-semibold">✓ Coupon applied — Discount: {formatInr(appliedCoupon.discountAmount)}</p>
                      ) : (
                        <p>✗ {appliedCoupon.message}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as MembershipPaymentMethod)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                  >
                    {MEMBERSHIP_PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m} className="bg-slate-900">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label="Reference / txn id" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>

              {pendingAfter > 0.02 && (
                <div className="mt-3">
                  <Input label="Next due date (required for partial)" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
                </div>
              )}
              {exceedsOutstanding && (
                <p className="mt-3 text-sm text-rose-300">Payment amount cannot exceed outstanding balance.</p>
              )}
              {duplicateWarn && (
                <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {duplicateWarn}
                </p>
              )}
              <p className="mt-3 text-xs text-slate-500">Remaining after this entry (estimate): {formatInr(pendingAfter)}</p>
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
                    if (!data || paidNum <= 0 || exceedsOutstanding) return
                    try {
                      const { data: dup } = await membershipPaymentsService.checkDuplicate(data.id, paidNum)
                      if (dup.isDuplicate) {
                        setDuplicateWarn(dup.message ?? 'Similar payment detected. Please verify before continuing.')
                      } else {
                        setDuplicateWarn(null)
                      }
                    } catch {
                      setDuplicateWarn(null)
                    }
                    setConfirmOpen(true)
                  }}
                  disabled={mutation.isPending || paidNum <= 0 || exceedsOutstanding}
                >
                  Review &amp; pay
                </Button>
              </div>
            </section>

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

        {financialSummary && (
          <PaymentConfirmationModal
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => mutation.mutate()}
            confirming={mutation.isPending}
            memberName={financialSummary.memberName ?? 'Member'}
            memberId={financialSummary.memberCode ?? `M-${financialSummary.userId ?? data?.userId}`}
            memberPhotoUrl={financialSummary.memberPhotoUrl}
            planName={data?.planName}
            summary={financialSummary}
            paymentAmount={paidNum}
          />
        )}

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

        <PaymentReceiptModal
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          receipt={receipt}
          onDownloadPdf={
            data
              ? () => {
                  membershipPaymentsService.invoicePdf(data.id).then(({ data: blob }) => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `receipt-${receipt?.receiptNumber ?? data.id}.pdf`
                    a.click()
                    URL.revokeObjectURL(url)
                  })
                }
              : undefined
          }
        />
      </div>
    </DashboardLayout>
  )
}
