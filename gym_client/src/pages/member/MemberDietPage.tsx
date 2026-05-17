import { Link } from 'react-router-dom'
import { useMemo, type ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Apple,
  ArrowLeft,
  ChefHat,
  Coffee,
  Cookie,
  Drumstick,
  Flame,
  Info,
  Leaf,
  Moon,
  Salad,
  Soup,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Target,
  Utensils,
  Wheat,
} from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { AnimatedStat } from '../../components/dashboard/premium/AnimatedStat'
import { getDashboardUser } from '../../lib/dashboardUser'
import { meService, type MeDietPlan } from '../../services/me.service'

type IconType = ComponentType<{ className?: string }>

function getMealIcon(name: string, order: number): IconType {
  const n = name.toLowerCase()
  if (n.includes('breakfast') || n.includes('morning')) return Sunrise
  if (n.includes('brunch')) return Coffee
  if (n.includes('lunch') || n.includes('midday') || n.includes('noon')) return Sun
  if (n.includes('snack') || n.includes('shake') || n.includes('smoothie')) return Apple
  if (n.includes('pre-workout') || n.includes('pre workout')) return Flame
  if (n.includes('post-workout') || n.includes('post workout')) return Drumstick
  if (n.includes('dinner') || n.includes('supper') || n.includes('evening')) return Sunset
  if (n.includes('late') || n.includes('night')) return Moon
  if (n.includes('salad')) return Salad
  if (n.includes('soup')) return Soup
  if (order === 1) return Sunrise
  if (order === 2) return Sun
  if (order === 3) return Sunset
  if (order >= 4) return Moon
  return Utensils
}

function formatDate(iso?: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return Math.round(n)
}

function CalorieRing({ calories }: { calories: number }) {
  const ringStyle = {
    background:
      'conic-gradient(from -90deg, #f97316 0%, #fb923c 60%, #f59e0b 85%, rgba(255,255,255,0.06) 85%)',
  }
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="flex size-44 items-center justify-center rounded-full p-[10px] shadow-[0_0_40px_-8px_rgba(249,115,22,0.55)]"
        style={ringStyle}
      >
        <div className="flex size-full flex-col items-center justify-center rounded-full border border-white/10 bg-neutral-950/85 backdrop-blur-xl">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300/80">
            <Flame className="size-3" /> Daily
          </span>
          <AnimatedStat
            value={calories}
            format={(n) => n.toLocaleString()}
            className="mt-1 text-3xl font-bold tabular-nums text-white"
          />
          <span className="mt-0.5 text-[11px] text-slate-400">kcal / day</span>
        </div>
      </div>
    </div>
  )
}

function MacroBar({
  label,
  grams,
  totalCalories,
  caloriesPerGram,
  gradient,
  icon: Icon,
}: {
  label: string
  grams: number | null | undefined
  totalCalories: number
  caloriesPerGram: number
  gradient: string
  icon: IconType
}) {
  const g = grams ?? 0
  const macroCals = g * caloriesPerGram
  const pct = totalCalories > 0 ? clampPct((macroCals / totalCalories) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300">
          <Icon className="size-3.5 text-slate-400" />
          {label}
        </span>
        <span className="text-xs tabular-nums text-slate-400">
          <span className="font-semibold text-white">{g}</span>
          <span className="ml-0.5">g</span>
          <span className="ml-2 text-slate-500">.</span>
          <span className="ml-2 text-slate-400">{pct}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-[width] duration-700 ease-out`}
          style={{ width: pct + '%' }}
        />
      </div>
    </div>
  )
}

function MealCard({
  meal,
  index,
}: {
  meal: MeDietPlan['meals'][number]
  index: number
}) {
  const Icon = getMealIcon(meal.mealName, meal.mealOrder ?? index + 1)
  const totalCalories = meal.items.reduce((sum, item) => sum + (item.calories ?? 0), 0)

  return (
    <article
      className={[
        'glass-card group relative overflow-hidden rounded-2xl border border-white/[0.08]',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-400/30',
        'hover:shadow-[0_12px_40px_-12px_rgba(249,115,22,0.35)]',
      ].join(' ')}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 blur-2xl"
      />
      <div className="relative p-5 sm:p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/25 to-amber-600/15 text-orange-300 border border-white/10 shadow-inner">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Meal {meal.mealOrder ?? index + 1}
              </span>
              <h3 className="truncate text-base font-semibold text-white sm:text-lg">
                {meal.mealName}
              </h3>
            </div>
          </div>
          {totalCalories > 0 ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-200">
              <Flame className="size-3" />
              <span className="tabular-nums">{totalCalories}</span>
              <span className="text-orange-300/70">kcal</span>
            </span>
          ) : null}
        </header>

        {meal.items.length ? (
          <ul className="space-y-1.5">
            {meal.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border border-white/[0.04] bg-white/[0.02] transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="size-1.5 shrink-0 rounded-full bg-orange-400/60" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.foodName}</p>
                    {item.quantity ? (
                      <p className="text-xs text-slate-400">{item.quantity}</p>
                    ) : null}
                  </div>
                </div>
                {item.calories != null ? (
                  <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">
                    {item.calories} kcal
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-slate-500">No items in this meal yet.</p>
        )}
      </div>
    </article>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 pb-12" aria-busy="true">
      <div className="h-32 animate-pulse rounded-3xl bg-white/[0.04]" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
      <div className="space-y-3">
        <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <GlassPanel role="member">
      <div className="flex flex-col items-center px-4 py-10 text-center sm:py-14">
        <div className="relative">
          <span
            aria-hidden
            className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-600/10 blur-2xl"
          />
          <span className="relative flex size-20 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-amber-600/10 text-orange-300">
            <ChefHat className="size-10" />
          </span>
        </div>
        <h3 className="mt-6 text-lg font-semibold text-white">No diet plan assigned yet</h3>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Your trainer hasn&apos;t built a nutrition plan for you yet. Drop them a message at the gym and they&apos;ll tailor meals to your goal.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
            <Leaf className="size-3.5 text-emerald-300" />
            Balanced meals
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
            <Target className="size-3.5 text-orange-300" />
            Goal-driven macros
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
            <Sparkles className="size-3.5 text-amber-300" />
            Made for you
          </span>
        </div>
      </div>
    </GlassPanel>
  )
}

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

  const totals = useMemo(() => {
    if (!plan) return null
    const itemCals = plan.meals.reduce(
      (sum, m) => sum + m.items.reduce((s, i) => s + (i.calories ?? 0), 0),
      0
    )
    const targetCals = plan.calories || 0
    const pct = targetCals > 0 ? clampPct((itemCals / targetCals) * 100) : 0
    const mealsCount = plan.meals.length
    const itemsCount = plan.meals.reduce((s, m) => s + m.items.length, 0)
    return { itemCals, targetCals, pct, mealsCount, itemsCount }
  }, [plan])

  const dateRange = plan
    ? [formatDate(plan.startDate), formatDate(plan.endDate)].filter(Boolean).join(' to ')
    : ''

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto w-full max-w-5xl pb-12">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-orange-300"
        >
          <ArrowLeft className="size-3.5" />
          Back to dashboard
        </Link>

        <header className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-amber-600/10 text-orange-300">
            <Utensils className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Your Nutrition Plan
            </h1>
            <p className="text-sm text-slate-400">
              Meals and macros tailored by your trainer.
            </p>
          </div>
        </header>

        {isLoading ? (
          <LoadingSkeleton />
        ) : plan ? (
          <div className="space-y-6">
            <section className="glass-card relative overflow-hidden rounded-3xl border border-white/[0.08] p-5 sm:p-7">
              <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-orange-500/15 blur-3xl" />
              <span aria-hidden className="pointer-events-none absolute -left-12 bottom-0 size-44 rounded-full bg-amber-500/10 blur-3xl" />

              <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
                <div className="flex justify-center lg:justify-start">
                  <CalorieRing calories={plan.calories} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-orange-200">
                      <Target className="size-3" />
                      {plan.goalType}
                    </span>
                    {dateRange ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                        {dateRange}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">{plan.planName}</h2>

                  {plan.description ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300/90">{plan.description}</p>
                  ) : null}

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <MacroBar label="Protein" grams={plan.proteinGrams} totalCalories={plan.calories} caloriesPerGram={4} gradient="from-rose-400 to-red-500" icon={Drumstick} />
                    <MacroBar label="Carbs" grams={plan.carbsGrams} totalCalories={plan.calories} caloriesPerGram={4} gradient="from-amber-300 to-orange-500" icon={Wheat} />
                    <MacroBar label="Fats" grams={plan.fatsGrams} totalCalories={plan.calories} caloriesPerGram={9} gradient="from-yellow-300 to-amber-500" icon={Cookie} />
                  </div>
                </div>
              </div>
            </section>

            {totals ? (
              <section className="grid gap-3 sm:grid-cols-3">
                <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl">
                  <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-600/25 blur-2xl" />
                  <div className="relative flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Meals / day</p>
                      <AnimatedStat value={totals.mealsCount} format={(n) => String(n)} className="mt-1 block text-2xl font-bold tabular-nums text-white" />
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-orange-300">
                      <Utensils className="size-4" />
                    </span>
                  </div>
                </article>

                <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl">
                  <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-emerald-500/25 to-teal-600/15 blur-2xl" />
                  <div className="relative flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Food items</p>
                      <AnimatedStat value={totals.itemsCount} format={(n) => String(n)} className="mt-1 block text-2xl font-bold tabular-nums text-white" />
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
                      <Salad className="size-4" />
                    </span>
                  </div>
                </article>

                <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl">
                  <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-rose-500/25 to-orange-600/15 blur-2xl" />
                  <div className="relative flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Calories planned</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                        <AnimatedStat value={totals.itemCals} format={(n) => n.toLocaleString()} />
                        <span className="ml-1 text-sm font-normal text-slate-400">/ {totals.targetCals.toLocaleString()}</span>
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-[width] duration-700" style={{ width: totals.pct + '%' }} />
                      </div>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-rose-300">
                      <Flame className="size-4" />
                    </span>
                  </div>
                </article>
              </section>
            ) : null}

            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-white">Daily meals</h2>
                  <p className="text-xs text-slate-400">
                    {plan.meals.length} meal{plan.meals.length === 1 ? '' : 's'} scheduled through the day.
                  </p>
                </div>
              </div>

              {plan.meals.length ? (
                <div className="space-y-3">
                  {plan.meals.slice().sort((a, b) => (a.mealOrder ?? 0) - (b.mealOrder ?? 0)).map((meal, idx) => (
                    <MealCard key={meal.id} meal={meal} index={idx} />
                  ))}
                </div>
              ) : (
                <GlassPanel role="member">
                  <p className="py-2 text-sm text-slate-400">No meals have been added to this plan yet.</p>
                </GlassPanel>
              )}
            </section>

            <section className="rounded-2xl border border-orange-400/15 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
                  <Info className="size-4" />
                </span>
                <div className="text-sm text-slate-200">
                  <p className="font-medium text-white">Stay on track</p>
                  <p className="mt-0.5 text-slate-300/90">
                    Hit your protein target first, then fill in carbs around your workouts. Hydrate well and aim for 2 to 3 L of water every day.
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </DashboardLayout>
  )
}

void Soup
void Coffee
