export type RevenuePoint = {
  date: string
  amount: number
  paymentsCount: number
}

export type PlanSalesPoint = {
  planId: number
  planName: string
  salesCount: number
  revenueAmount: number
}

export type AttendancePoint = {
  date: string
  count: number
}

export type ReportSummary = {
  fromDate: string
  toDate: string
  totalRevenue: number
  revenueTrend: RevenuePoint[]
  planSales: PlanSalesPoint[]
  churnCount: number
  churnRatePercent: number | null
  attendanceTrend: AttendancePoint[]
}

