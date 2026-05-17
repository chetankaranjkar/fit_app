import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { getDashboardUser } from '../../lib/dashboardUser'
import { meService } from '../../services/me.service'

export function MemberDietPage() {
  const { userName } = getDashboardUser()
  const { data: plan, isLoading } = useQuery({
    queryKey: ['member-diet-plan'],
    queryFn: async () => {
      try {
        const { data } = await meService.getDietPlan()
        return data
      } catch {
        return null
      }
    },
  })

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <header>
          <h1 className="text-2xl font-bold text-white">Diet</h1>
          <p className="text-sm text-slate-400">Meals and macros from your trainer&apos;s plan.</p>
        </header>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : plan ? (
          <GlassPanel role="member" title={plan.planName} subtitle={plan.goalType}>
            <div className="mb-4 grid gap-3 sm:grid-cols-4 text-center text-sm">
              <div>
                <p className="text-slate-400">Calories</p>
                <p className="mt-1 text-lg font-semibold text-white">{plan.calories}</p>
              </div>
              <div>
                <p className="text-slate-400">Protein</p>
                <p className="mt-1 text-lg font-semibold text-white">{plan.proteinGrams ?? '—'} g</p>
              </div>
              <div>
                <p className="text-slate-400">Carbs</p>
                <p className="mt-1 text-lg font-semibold text-white">{plan.carbsGrams ?? '—'} g</p>
              </div>
              <div>
                <p className="text-slate-400">Fats</p>
                <p className="mt-1 text-lg font-semibold text-white">{plan.fatsGrams ?? '—'} g</p>
              </div>
            </div>
            <ul className="space-y-4">
              {plan.meals.map((meal) => (
                <li key={meal.id} className="rounded-xl border border-white/10 p-3">
                  <p className="font-medium text-white">{meal.mealName}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    {meal.items.map((item) => (
                      <li key={item.id}>
                        {item.foodName}
                        {item.quantity ? ` · ${item.quantity}` : ''}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </GlassPanel>
        ) : (
          <GlassPanel role="member" title="No diet plan assigned">
            <p className="text-sm text-slate-400">
              Your trainer can assign a nutrition plan from the coach hub. Contact your gym if you need help.
            </p>
          </GlassPanel>
        )}
        <Link to="/dashboard" className="text-sm text-orange-400 hover:underline">
          ← Back to home
        </Link>
      </div>
    </DashboardLayout>
  )
}
