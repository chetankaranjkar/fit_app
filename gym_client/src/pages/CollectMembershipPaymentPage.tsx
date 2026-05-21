import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { membershipPaymentsService } from '../services/membershipPayments.service'
import { formatInr } from '../lib/formatInr'
import { getApiErrorMessage } from '../lib/apiErrors'
import {
  MEMBERSHIP_PAYMENT_METHODS,
  computeNetPayable,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from '../components/billing/membershipPaymentUi'
import type { MembershipPaymentMethod } from '../types/membershipPayment'
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

  const { data, isLoading } = useQuery({
    queryKey: ['membership-payment', membershipId],
    queryFn: async () => {
      const { data: d } = await membershipPaymentsService.byMembership(membershipId)
      return d
    },
    enabled: membershipId > 0 && canPay,
  })

  const net = useMemo(() => {
    if (!data) return 0
    return computeNetPayable(data.totalAmount, data.discountAmount, data.waiverAmount, data.netPayableAmount)
  }, [data])

  const installmentKind =
    paidNum > 0 && pendingAfter <= 0.02 ? 'full' : paidNum > 0 && pendingAfter > 0.02 ? 'partial' : null

  const paidNum = Number(amount) || 0
  const discNum = Number(discount) || 0
  const pendingAfter = useMemo(() => {
    if (!data) return 0
    const adjustedNet = Math.max(0, data.totalAmount - discNum - data.waiverAmount)
    return Math.max(0, adjustedNet - (data.paidAmount + paidNum))
  }, [data, discNum, paidNum])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('No data')
      const body = {
        amount: paidNum,
        method,
        referenceNumber: reference.trim() || undefined,
        transactionDate: new Date().toISOString(),
        nextDueDate:
          pendingAfter > 0.02 ? (nextDue ? new Date(`${nextDue}T12:00:00`).toISOString() : undefined) : undefined,
        discountAmount: discNum > 0 ? discNum : undefined,
      }
      const { data: res } = await membershipPaymentsService.addInstallment(data.id, body)
      return res
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['membership-payment', membershipId] })
      const msg =
        res.paymentStatus === 'Paid' || res.isFullyPaid
          ? 'Full payment recorded. Membership is now active.'
          : res.paymentStatus === 'Partial' || res.isPartiallyPaid
            ? `Partial payment recorded. Pending ${formatInr(res.pendingAmount)}.`
            : 'Payment recorded.'
      toast.success(msg)
      setAmount('')
      setNextDue('')
      setDiscount('')
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
              <h2 className="text-sm font-semibold text-white">Summary</h2>
              <dl className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                <dt>Plan</dt>
                <dd className="font-medium text-white">{data.planName ?? '—'}</dd>
                <dt>Total</dt>
                <dd>{formatInr(data.totalAmount)}</dd>
                <dt>Paid</dt>
                <dd>{formatInr(data.paidAmount)}</dd>
                <dt>Pending</dt>
                <dd className="text-amber-200">{formatInr(data.pendingAmount)}</dd>
                <dt>Billing status</dt>
                <dd>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(data.paymentStatus)}`}
                  >
                    {paymentStatusLabel(data.paymentStatus)}
                  </span>
                </dd>
                <dt>Membership</dt>
                <dd className="text-slate-400">{data.membershipStatus}</dd>
              </dl>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
              <h2 className="text-sm font-semibold text-white">Record payment</h2>
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
                  onClick={() => setAmount(String(Math.round(net * 0.25 * 100) / 100))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(net * 0.5 * 100) / 100))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(String(data.pendingAmount))}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Full amount
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input label="Amount (₹)" type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
                <Input label="Discount (₹)" type="number" min={0} step={0.01} value={discount} onChange={(e) => setDiscount(e.target.value)} />
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
              <p className="mt-3 text-xs text-slate-500">Remaining after this entry (estimate): {formatInr(pendingAfter)}</p>
              <div className="mt-4 flex justify-end">
                <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || paidNum <= 0}>
                  Save payment
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
              <h2 className="text-sm font-semibold text-white">Timeline</h2>
              <ul className="mt-3 divide-y divide-white/5 text-sm text-slate-300">
                {data.transactions.length === 0 && <li className="py-2 text-slate-500">No transactions yet.</li>}
                {data.transactions.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-medium text-white">{formatInr(t.transactionAmount)}</span>
                    <span className="text-slate-500">{new Date(t.transactionDate).toLocaleString()}</span>
                    <span>{t.transactionMethod}</span>
                    <span className="text-slate-500">{t.collectedByName ?? '—'}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
