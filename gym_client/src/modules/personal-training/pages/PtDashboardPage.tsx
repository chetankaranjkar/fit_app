import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { MetricCard } from '../../../components/dashboard/MetricCard'
import { DashboardMetricsGrid } from '../../../components/layout/DashboardMetricsGrid'
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
          <DashboardMetricsGrid cols={4}>
            <MetricCard title="Total revenue" value={formatInr(summary?.totalRevenue ?? 0)} icon={<span />} />
            <MetricCard title="Collected" value={formatInr(summary?.totalPaid ?? 0)} icon={<span />} />
            <MetricCard title="Pending" value={formatInr(summary?.totalPending ?? 0)} icon={<span />} />
            <MetricCard title="Packages sold" value={String(summary?.packagesSold ?? 0)} icon={<span />} />
          </DashboardMetricsGrid>
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
