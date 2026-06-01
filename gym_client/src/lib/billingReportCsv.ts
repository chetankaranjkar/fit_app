import type { BillingReport } from '../types/membershipPayment'

export function billingReportToCsv(report: BillingReport): string {
  const header = ['Date', 'Receipt', 'Member', 'Amount', 'Method', 'Status', 'Notes']
  const rows = report.lines.map((line) => [
    line.date ? new Date(line.date).toISOString().slice(0, 10) : '',
    line.receiptNumber ?? '',
    line.memberName ?? '',
    String(line.amount),
    line.method ?? '',
    line.status ?? '',
    (line.notes ?? '').replace(/"/g, '""'),
  ])
  const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v}"` : v)
  return [header, ...rows].map((r) => r.map(escape).join(',')).join('\n')
}

export function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
