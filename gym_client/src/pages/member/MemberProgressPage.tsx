import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { TrendAreaChart } from '../../components/dashboard/premium/TrendAreaChart'
import { getDashboardUser } from '../../lib/dashboardUser'
import { meService } from '../../services/me.service'

export function MemberProgressPage() {
  const { userName } = getDashboardUser()
  const { data } = useQuery({
    queryKey: ['member-progress'],
    queryFn: async () => {
      const { data: dash } = await meService.getDashboard()
      return dash
    },
  })

  const chart =
    data?.attendance?.last30Days?.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric' }),
      value: d.visited ? 1 : 0,
    })) ?? []

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <header>
          <h1 className="text-2xl font-bold text-white">Progress</h1>
          <p className="text-sm text-slate-400">Weight, attendance, and monthly momentum.</p>
        </header>
        <GlassPanel role="member" title="Body">
          <p className="text-3xl font-bold text-white">
            {data?.latestBodyMetric?.weight != null ? `${data.latestBodyMetric.weight} kg` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Body fat {data?.latestBodyMetric?.bodyFatPercent ?? '—'}% · BMI{' '}
            {data?.latestBodyMetric?.bmi != null ? data.latestBodyMetric.bmi.toFixed(1) : '—'}
          </p>
        </GlassPanel>
        <GlassPanel role="member" title="Monthly attendance">
          {chart.length ? <TrendAreaChart role="member" data={chart} height={200} /> : null}
        </GlassPanel>
        <Link to="/dashboard" className="text-sm text-orange-400 hover:underline">
          ← Back to home
        </Link>
      </div>
    </DashboardLayout>
  )
}
