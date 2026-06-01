import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { membershipPaymentsService } from '../services/membershipPayments.service'
import { formatInr } from '../lib/formatInr'
import { billingReportToCsv, downloadCsv } from '../lib/billingReportCsv'
import { getApiErrorMessage } from '../lib/apiErrors'
import { usePermission } from '../features/auth/hooks/usePermission'
import { authService } from '../services/auth.service'
import type { BillingReport } from '../types/membershipPayment'

const REPORT_OPTIONS = [
  { id: 'daily-collection', label: 'Daily collection', apiType: 'daily-collection' },
  { id: 'monthly-collection', label: 'Monthly collection', apiType: 'monthly-collection' },
  { id: 'outstanding-dues', label: 'Outstanding dues', apiType: 'outstanding-dues' },
  { id: 'coupon-discount', label: 'Coupon discount', apiType: 'coupon-discount' },
  { id: 'waive-off', label: 'Waive-off (approved)', apiType: 'waive-off' },
  { id: 'voided', label: 'Voided payments', apiType: 'voided' },
  { id: 'refunds', label: 'Refund report', apiType: 'refunds' },
] as const

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

function defaultFromDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

export function BillingReportsPage() {
  const { userName } = getDashboardUser()
  const canReports = usePermission(authService.permissionCodes.reports)
  const canPayments = usePermission(authService.permissionCodes.payments)
  const allowed = canReports || canPayments

  const [reportId, setReportId] = useState<string>(REPORT_OPTIONS[0].id)
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [ledgerUserId, setLedgerUserId] = useState('')
  const [runKey, setRunKey] = useState(0)

  const selected = REPORT_OPTIONS.find((r) => r.id === reportId) ?? REPORT_OPTIONS[0]
  const isLedger = reportId === 'member-ledger'

  const { data: report, isLoading, isFetching, error } = useQuery({
    queryKey: ['billing-report', selected.apiType, fromDate, toDate, runKey, isLedger ? ledgerUserId : ''],
    queryFn: async () => {
      if (isLedger) {
        const uid = Number(ledgerUserId)
        if (!uid) throw new Error('Enter a member user ID for the ledger report.')
        const { data: ledger } = await membershipPaymentsService.memberLedger(uid)
        const lines = ledger.periods.flatMap((p) =>
          (p.payments ?? []).map((t) => ({
            date: t.transactionDate,
            receiptNumber: t.receiptNumber,
            memberName: ledger.memberName,
            amount: t.transactionAmount,
            method: t.transactionMethod,
            status: t.status ?? 'Completed',
            notes: `${p.planName ?? 'Membership'} · Net ${p.netPayable} · Bal ${p.outstandingBalance}`,
          })),
        )
        return {
          reportType: 'member-ledger',
          fromDate,
          toDate,
          totalAmount: ledger.periods.reduce((s, p) => s + p.totalPaid, 0),
          recordCount: lines.length,
          lines,
        } satisfies BillingReport
      }
      const { data } = await membershipPaymentsService.report(selected.apiType, fromDate, toDate)
      return data
    },
    enabled: allowed && runKey > 0 && (!isLedger || Number(ledgerUserId) > 0),
    retry: false,
  })

  const summary = useMemo(() => {
    if (!report) return null
    return {
      total: report.totalAmount,
      count: report.recordCount,
    }
  }, [report])

  if (!allowed) {
    return (
      <DashboardLayout userName={userName}>
        <p className="px-6 text-slate-400">Reports or Payments permission required.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Billing"
        titleGradient="reports"
        subtitle="Daily and monthly collections, outstanding dues, coupons, waive-offs, voids, refunds, and member ledgers."
        showExport={false}
      >
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase text-slate-400">Report</label>
            <select
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100"
            >
              {REPORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
              <option value="member-ledger">Member ledger</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          {isLedger && (
            <div className="lg:col-span-2">
              <Input
                label="Member user ID"
                value={ledgerUserId}
                onChange={(e) => setLedgerUserId(e.target.value)}
                placeholder="e.g. 42"
              />
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
            <Button type="button" onClick={() => setRunKey((k) => k + 1)}>
              Run report
            </Button>
            {report && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const csv = billingReportToCsv(report)
                  downloadCsv(csv, `${report.reportType}-${fromDate}-${toDate}.csv`)
                  toast.success('CSV downloaded')
                }}
              >
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {error && runKey > 0 && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {getApiErrorMessage(error, 'Could not load report')}
          </p>
        )}

        {(isLoading || isFetching) && runKey > 0 && <p className="text-slate-400">Loading report…</p>}

        {summary && report && !isLoading && (
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <p className="text-slate-300">
              Records: <strong className="text-white">{summary.count}</strong>
            </p>
            <p className="text-slate-300">
              Total: <strong className="text-white">{formatInr(summary.total)}</strong>
            </p>
          </div>
        )}

        {report && report.lines.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[800px] w-full text-left text-sm text-slate-200">
              <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.lines.map((line, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2 whitespace-nowrap">
                      {line.date ? new Date(line.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{line.receiptNumber ?? '—'}</td>
                    <td className="px-4 py-2">{line.memberName ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatInr(line.amount)}</td>
                    <td className="px-4 py-2">{line.method ?? '—'}</td>
                    <td className="px-4 py-2">{line.status ?? '—'}</td>
                    <td className="px-4 py-2 max-w-[200px] truncate text-slate-500">{line.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {report && report.lines.length === 0 && runKey > 0 && !isLoading && (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-slate-500">
            No rows for this report and date range.
          </p>
        )}

        {runKey === 0 && (
          <p className="text-sm text-slate-500">Choose a report and date range, then click Run report.</p>
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
