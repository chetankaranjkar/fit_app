import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { getDashboardUser } from '../../lib/dashboardUser'
import { meService } from '../../services/me.service'

export function MemberWorkoutsPage() {
  const { userName } = getDashboardUser()
  const { data, isLoading } = useQuery({
    queryKey: ['member-workouts'],
    queryFn: async () => {
      const { data: plans } = await meService.getWorkoutPlans()
      return plans ?? []
    },
  })

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <header>
          <h1 className="text-2xl font-bold text-white">Workouts</h1>
          <p className="text-sm text-slate-400">Your assigned plans and upcoming sessions.</p>
        </header>
        <GlassPanel role="member" title="Active plans">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : Array.isArray(data) && data.length ? (
            <ul className="space-y-2 text-sm text-slate-200">
              {(data as { id?: number; name?: string; title?: string }[]).map((plan, i) => (
                <li key={plan.id ?? i} className="rounded-lg border border-white/10 px-3 py-2">
                  {plan.name ?? plan.title ?? `Plan ${i + 1}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No workout plan assigned yet. Ask your trainer.</p>
          )}
        </GlassPanel>
        <Link to="/dashboard" className="text-sm text-orange-400 hover:underline">
          ← Back to home
        </Link>
      </div>
    </DashboardLayout>
  )
}
