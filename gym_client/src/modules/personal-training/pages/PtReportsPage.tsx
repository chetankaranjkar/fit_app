import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { Button } from '../../../components/ui/Button'
import { MetricCard } from '../../../components/dashboard/MetricCard'
import { DashboardMetricsGrid } from '../../../components/layout/DashboardMetricsGrid'
import { ptReportsService } from '../../../services/personalTraining.service'
import { formatInr } from '../../../lib/formatInr'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return u?.fullName?.trim() || u?.username?.trim() || 'User'
  } catch {
    return 'User'
  }
}

export function PtReportsPage() {
  const { data: revenue } = useQuery({
    queryKey: ['pt-report-revenue'],
    queryFn: async () => (await ptReportsService.revenue()).data,
  })
  const { data: util } = useQuery({
    queryKey: ['pt-report-util'],
    queryFn: async () => (await ptReportsService.utilization()).data,
  })

  const downloadCsv = async () => {
    const res = await ptReportsService.exportRevenueCsv()
    const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'pt-revenue.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout userName={getDashboardUser()}>
      <DashboardSubpageShell
        eyebrow="Personal Training"
        titleGradient="Reports"
        primaryAction={{ label: 'Export CSV', onClick: downloadCsv }}
      >
        <DashboardMetricsGrid cols={4}>
          <MetricCard title="Revenue" value={formatInr(revenue?.totalRevenue ?? 0)} icon={<span />} />
          <MetricCard title="Paid" value={formatInr(revenue?.totalPaid ?? 0)} icon={<span />} />
          <MetricCard title="Utilization %" value={`${util?.utilizationPercent ?? 0}%`} icon={<span />} />
          <MetricCard title="No-shows" value={String(util?.sessionsNoShow ?? 0)} icon={<span />} />
        </DashboardMetricsGrid>
        <Button variant="secondary" onClick={() => window.print()}>Print report</Button>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
