import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { PaymentReceiptModal, type PaymentReceiptData } from '../components/billing/PaymentReceiptModal'
import { membershipPaymentsService } from '../services/membershipPayments.service'
import { formatInr } from '../lib/formatInr'
import { getApiErrorMessage } from '../lib/apiErrors'
import { usePermission } from '../features/auth/hooks/usePermission'
import { authService } from '../services/auth.service'
import type { MembershipPaymentMethod, MembershipPaymentTransactionStatus } from '../types/membershipPayment'

const VOID_REASONS = [
  'Wrong Amount Entered',
  'Wrong Member Selected',
  'Duplicate Entry',
  'Data Entry Error',
  'Other',
]

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

function statusClass(status: string) {
  const u = status.toLowerCase()
  if (u === 'completed') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
  if (u === 'voided') return 'border-slate-500/40 bg-slate-500/15 text-slate-300'
  if (u === 'refunded') return 'border-violet-500/40 bg-violet-500/15 text-violet-200'
  return 'border-white/10 bg-white/5 text-slate-300'
}

export function MembershipPaymentHistoryPage() {
  const { userName } = getDashboardUser()
  const canPay = usePermission(authService.permissionCodes.payments)
  const canVoid = usePermission(authService.permissionCodes.voidPayment)
  const canRefund = usePermission(authService.permissionCodes.refundPayment)
  const queryClient = useQueryClient()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState<MembershipPaymentTransactionStatus | ''>('')
  const [method, setMethod] = useState<MembershipPaymentMethod | ''>('')
  const [memberId, setMemberId] = useState('')

  const [voidTarget, setVoidTarget] = useState<number | null>(null)
  const [voidReason, setVoidReason] = useState(VOID_REASONS[0])
  const [refundTarget, setRefundTarget] = useState<number | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const queryParams = useMemo(
    () => ({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      status: status || undefined,
      method: method || undefined,
      userId: memberId ? Number(memberId) : undefined,
    }),
    [fromDate, toDate, status, method, memberId],
  )

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['payment-transactions', queryParams],
    queryFn: async () => {
      const { data } = await membershipPaymentsService.listTransactions(queryParams)
      return Array.isArray(data) ? data : []
    },
    enabled: canPay,
  })

  const voidMutation = useMutation({
    mutationFn: () => membershipPaymentsService.voidTransaction(voidTarget!, voidReason),
    onSuccess: () => {
      toast.success('Payment voided')
      setVoidTarget(null)
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Void failed')),
  })

  const refundMutation = useMutation({
    mutationFn: () =>
      membershipPaymentsService.refundTransaction(refundTarget!, {
        refundAmount: Number(refundAmount),
        refundReason: refundReason.trim(),
      }),
    onSuccess: () => {
      toast.success('Payment refunded')
      setRefundTarget(null)
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Refund failed')),
  })

  if (!canPay) {
    return (
      <DashboardLayout userName={userName}>
        <p className="px-6 text-slate-400">Payments permission required.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Billing"
        titleGradient="payment history"
        subtitle="Membership installments — void, refund, and receipts"
      >
        <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase text-slate-400">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MembershipPaymentTransactionStatus | '')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="Completed">Completed</option>
              <option value="Voided">Voided</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase text-slate-400">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as MembershipPaymentMethod | '')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="Cash">Cash</option>
              <option value="Upi">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>
          <Input label="Member user ID" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-[960px] w-full text-left text-sm text-slate-200">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Collected by</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No payments found.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(row.transactionDate).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.receiptNumber}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.memberPhotoUrl ? (
                        <img src={row.memberPhotoUrl} alt="" className="size-8 rounded-full object-cover" />
                      ) : null}
                      <span>{row.memberName ?? row.userId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatInr(row.transactionAmount)}</td>
                  <td className="px-4 py-3">{row.transactionMethod}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.collectedByName ?? '—'}</td>
                  <td className="px-4 py-3 max-w-[140px] truncate text-slate-500">{row.remarks ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          setReceipt({
                            receiptNumber: row.receiptNumber,
                            memberName: row.memberName ?? `User ${row.userId}`,
                            memberId: `M-${row.userId}`,
                            memberPhotoUrl: row.memberPhotoUrl,
                            planName: row.planName,
                            amountPaid: row.transactionAmount,
                            paymentMethod: row.transactionMethod,
                            remainingBalance: 0,
                            paymentDate: row.transactionDate,
                          })
                          setReceiptOpen(true)
                        }}
                      >
                        Receipt
                      </Button>
                      {canVoid && row.status === 'Completed' && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => setVoidTarget(row.id)}
                        >
                          Void
                        </Button>
                      )}
                      {canRefund && row.status === 'Completed' && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => {
                            setRefundTarget(row.id)
                            setRefundAmount(String(row.transactionAmount))
                          }}
                        >
                          Refund
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSubpageShell>

      <Modal open={voidTarget != null} onClose={() => setVoidTarget(null)} title="Void payment">
        <p className="mb-3 text-sm text-slate-400">This record will be preserved with void status. It will not count toward paid totals.</p>
        <select
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          {VOID_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setVoidTarget(null)}>
            Cancel
          </Button>
          <Button onClick={() => voidMutation.mutate()} disabled={voidMutation.isPending}>
            Confirm void
          </Button>
        </div>
      </Modal>

      <Modal open={refundTarget != null} onClose={() => setRefundTarget(null)} title="Refund payment">
        <div className="space-y-3">
          <Input label="Refund amount" type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
          <Input label="Refund reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRefundTarget(null)}>
            Cancel
          </Button>
          <Button onClick={() => refundMutation.mutate()} disabled={refundMutation.isPending}>
            Confirm refund
          </Button>
        </div>
      </Modal>

      <PaymentReceiptModal open={receiptOpen} onClose={() => setReceiptOpen(false)} receipt={receipt} />
    </DashboardLayout>
  )
}
