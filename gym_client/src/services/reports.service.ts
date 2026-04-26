import { api } from '../lib/api'
import type { ReportSummary } from '../types/report'

function buildQuery(fromDate: string, toDate: string) {
  return `fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`
}

export const reportsService = {
  getSummary: (fromDate: string, toDate: string) =>
    api.get<ReportSummary>(`/Reports/summary?${buildQuery(fromDate, toDate)}`),
  exportSummaryCsv: (fromDate: string, toDate: string) =>
    api.get(`/Reports/summary/export/csv?${buildQuery(fromDate, toDate)}`, { responseType: 'blob' }),
  exportSummaryXls: (fromDate: string, toDate: string) =>
    api.get(`/Reports/summary/export/xls?${buildQuery(fromDate, toDate)}`, { responseType: 'blob' }),
  exportPaymentsCsv: (fromDate: string, toDate: string) =>
    api.get(`/Reports/payments/export/csv?${buildQuery(fromDate, toDate)}`, { responseType: 'blob' }),
  exportPaymentsXls: (fromDate: string, toDate: string) =>
    api.get(`/Reports/payments/export/xls?${buildQuery(fromDate, toDate)}`, { responseType: 'blob' }),
}

