import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { MetricCard } from '../../../components/dashboard/MetricCard'
import { ptDashboardService } from '../../../services/personalTraining.service'
import { formatInr } from '../../../lib/formatInr'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return u?.fullName?.trim() || u?.username?.trim() || 'User'
  } catch {
    return 'User'
  }
}

export function PtDashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['pt-admin-summary'],
    queryFn: async () => (await ptDashboardService.adminSummary()).data,
  })

  return (
    <DashboardLayout userName={getDashboardUser()}>
      <DashboardSubpageShell
        eyebrow="Personal Training"
        titleGradient="Dashboard"
        subtitle="PT revenue, packages, and session overview."
      >
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total revenue" value={formatInr(summary?.totalRevenue ?? 0)} />
            <MetricCard label="Collected" value={formatInr(summary?.totalPaid ?? 0)} />
            <MetricCard label="Pending" value={formatInr(summary?.totalPending ?? 0)} />
            <MetricCard label="Packages sold" value={String(summary?.packagesSold ?? 0)} />
          </div>
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
