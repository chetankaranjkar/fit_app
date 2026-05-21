import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { formatInr } from '../../lib/formatInr'
import { usePermission } from '../../features/auth/hooks/usePermission'
import { authService } from '../../services/auth.service'
import { Button } from '../ui/Button'
import type { MembershipPaymentDetail } from '../../types/membershipPayment'

function statusClass(status: string) {
  const u = status.toLowerCase()
  if (u === 'paid') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
  if (u === 'partial' || u === 'pending') return 'border-amber-500/40 bg-amber-500/15 text-amber-200'
  if (u === 'overdue') return 'border-rose-500/40 bg-rose-500/15 text-rose-200'
  return 'border-white/10 bg-white/5 text-slate-300'
}

function lastPaymentDate(row: MembershipPaymentDetail): string | null {
  if (row.transactions?.length) {
    const sorted = [...row.transactions].sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
    )
    return sorted[0]?.transactionDate ?? null
  }
  return row.paymentDate ?? null
}

export function MemberPaymentHistoryTab({ userId }: { userId: number }) {
  const navigate = useNavigate()
  const canPayments = usePermission(authService.permissionCodes.payments)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['membership-payments-user', userId],
    queryFn: async () => {
      const { data: d } = await membershipPaymentsService.byUser(userId)
      return Array.isArray(d) ? d : []
    },
    enabled: userId > 0 && canPayments,
  })

  const rows = useMemo(() => [...data].sort((a, b) => b.id - a.id), [data])

  async function downloadInvoice(paymentId: number) {
    try {
      const { data: blob } = await membershipPaymentsService.invoicePdf(paymentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `membership-invoice-${paymentId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download invoice.')
    }
  }

  async function openInvoicePrint(paymentId: number) {
    try {
      const { data: blob } = await membershipPaymentsService.invoicePdf(paymentId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 120_000)
    } catch {
      toast.error('Could not open invoice for printing.')
    }
  }

  if (!canPayments) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        You need Payments permission to view membership billing history.
      </p>
    )
  }

  if (isLoading) return <p className="text-slate-400">Loading payment history…</p>

  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
        No membership billing records for this member yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-sm">
        <table className="min-w-[720px] w-full text-left text-sm text-slate-200">
          <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Membership</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last payment</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const lp = lastPaymentDate(row)
              const open = expandedId === row.id
              return (
                <Fragment key={row.id}>
                  <tr className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {row.invoiceNumber ?? row.paymentNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.planName ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatInr(row.totalAmount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-200/90">
                      {formatInr(row.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-200/90">
                      {formatInr(row.pendingAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(row.paymentStatus)}`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {lp ? new Date(lp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1.5 !text-xs"
                          onClick={() => navigate(`/dashboard/payments/collect?membershipId=${row.membershipId}&userId=${userId}`)}
                        >
                          Collect
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1.5 !text-xs"
                          onClick={() => void downloadInvoice(row.id)}
                          disabled={row.invoiceId == null}
                        >
                          PDF
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="!py-1.5 !text-xs"
                          onClick={() => setExpandedId(open ? null : row.id)}
                        >
                          {open ? 'Hide' : 'Timeline'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-black/20">
                      <td colSpan={8} className="px-4 py-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Transaction timeline
                        </p>
                        {row.transactions.length === 0 ? (
                          <p className="text-sm text-slate-500">No installments recorded.</p>
                        ) : (
                          <ul className="space-y-2">
                            {[...row.transactions]
                              .sort(
                                (a, b) =>
                                  new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
                              )
                              .map((t) => (
                                <li
                                  key={t.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300"
                                >
                                  <span className="font-medium text-white">{formatInr(t.transactionAmount)}</span>
                                  <span>{t.transactionMethod}</span>
                                  <span className="text-slate-500">
                                    {new Date(t.transactionDate).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-slate-500">{t.collectedByName ?? '—'}</span>
                                </li>
                              ))}
                          </ul>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="!py-1.5 !text-xs"
                            onClick={() => void openInvoicePrint(row.id)}
                            disabled={row.invoiceId == null}
                          >
                            Print invoice
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
