import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardMetricsGrid } from '../components/layout/DashboardMetricsGrid'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { dietPlansService } from '../services/dietPlans.service'
import type {
  DietPlanDto,
  DietMealDto,
  CreateDietPlanDto,
  UpdateDietPlanDto,
  CreateDietMealDto,
  CreateDietMealItemDto,
  UpdateDietMealItemDto,
} from '../types/dietPlan'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

const GOAL_OPTIONS = ['MuscleGain', 'FatLoss', 'Maintenance']

type GoalTheme = {
  label: string
  gradient: string
  ring: string
  text: string
  bg: string
}

const goalThemes: Record<string, GoalTheme> = {
  MuscleGain: {
    label: 'Muscle Gain',
    gradient: 'from-rose-400 via-red-500 to-orange-500',
    ring: 'ring-rose-400/30',
    text: 'text-rose-200',
    bg: 'bg-rose-500/10',
  },
  FatLoss: {
    label: 'Fat Loss',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    ring: 'ring-emerald-400/30',
    text: 'text-emerald-200',
    bg: 'bg-emerald-500/10',
  },
  Maintenance: {
    label: 'Maintenance',
    gradient: 'from-sky-400 via-blue-500 to-indigo-500',
    ring: 'ring-sky-400/30',
    text: 'text-sky-200',
    bg: 'bg-sky-500/10',
  },
}

const getGoalTheme = (goal: string): GoalTheme =>
  goalThemes[goal] ?? {
    label: goal,
    gradient: 'from-amber-400 to-orange-500',
    ring: 'ring-amber-400/30',
    text: 'text-amber-200',
    bg: 'bg-amber-500/10',
  }

const mealIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
  'pre-workout': '⚡',
  'post-workout': '💪',
}
const getMealIcon = (name: string) => {
  const key = name.trim().toLowerCase()
  for (const k of Object.keys(mealIcons)) {
    if (key.includes(k)) return mealIcons[k]
  }
  return '🍴'
}

const defaultPlanForm: CreateDietPlanDto = {
  planName: '',
  goalType: 'Maintenance',
  calories: 2000,
  proteinGrams: undefined,
  carbsGrams: undefined,
  fatsGrams: undefined,
  description: '',
  isActive: true,
}

export function DietPlansPage() {
  const { userName } = getDashboardUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const planIdFromUrl = searchParams.get('planId')
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<DietPlanDto | null>(null)
  const [planForm, setPlanForm] = useState<CreateDietPlanDto>(defaultPlanForm)
  const [planFormError, setPlanFormError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [goalFilter, setGoalFilter] = useState<string>('all')
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(() => {
    const id = planIdFromUrl ? parseInt(planIdFromUrl, 10) : NaN
    return Number.isFinite(id) ? id : null
  })

  useEffect(() => {
    const id = planIdFromUrl ? parseInt(planIdFromUrl, 10) : NaN
    if (Number.isFinite(id)) setSelectedPlanId(id)
  }, [planIdFromUrl])

  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [mealForm, setMealForm] = useState({ mealName: '', mealOrder: 0 })
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemMealId, setItemMealId] = useState<number | null>(null)
  const [itemForm, setItemForm] = useState({
    foodName: '',
    quantity: '',
    calories: undefined as number | undefined,
    proteinGrams: undefined as number | undefined,
    carbsGrams: undefined as number | undefined,
    fatsGrams: undefined as number | undefined,
  })

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['diet-plans'],
    queryFn: async () => {
      const { data } = await dietPlansService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: selectedPlan, isLoading: loadingPlan } = useQuery({
    queryKey: ['diet-plan', selectedPlanId],
    queryFn: async () => {
      if (selectedPlanId == null) return null
      const { data } = await dietPlansService.getById(selectedPlanId)
      return data
    },
    enabled: selectedPlanId != null,
  })

  const createPlanMutation = useMutation({
    mutationFn: (dto: CreateDietPlanDto) => dietPlansService.create(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diet-plans'] })
      setPlanModalOpen(false)
      setPlanForm(defaultPlanForm)
      setSelectedPlanId(data.id)
    },
    onError: (err: Error) => setPlanFormError(err.message || 'Failed to create plan'),
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateDietPlanDto }) =>
      dietPlansService.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['diet-plans'] })
      queryClient.invalidateQueries({ queryKey: ['diet-plan', id] })
      setPlanModalOpen(false)
      setEditingPlan(null)
      setPlanForm(defaultPlanForm)
    },
    onError: (err: Error) => setPlanFormError(err.message || 'Failed to update plan'),
  })

  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => dietPlansService.delete(id),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['diet-plans'] })
      if (selectedPlanId === id) setSelectedPlanId(null)
    },
  })

  const createMealMutation = useMutation({
    mutationFn: (dto: CreateDietMealDto) => dietPlansService.createMeal(dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['diet-plan', variables.dietPlanId] })
      queryClient.invalidateQueries({ queryKey: ['diet-plans'] })
      setMealModalOpen(false)
      setMealForm({ mealName: '', mealOrder: 0 })
    },
  })

  const deleteMealMutation = useMutation({
    mutationFn: (id: number) => dietPlansService.deleteMeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet-plan'] })
    },
  })

  const createItemMutation = useMutation({
    mutationFn: (dto: CreateDietMealItemDto) => dietPlansService.createMealItem(dto),
    onSuccess: () => {
      if (selectedPlanId != null)
        queryClient.invalidateQueries({ queryKey: ['diet-plan', selectedPlanId] })
      setItemModalOpen(false)
      setItemMealId(null)
      setItemForm({
        foodName: '',
        quantity: '',
        calories: undefined,
        proteinGrams: undefined,
        carbsGrams: undefined,
        fatsGrams: undefined,
      })
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateDietMealItemDto }) =>
      dietPlansService.updateMealItem(id, dto),
    onSuccess: () => {
      if (selectedPlanId != null)
        queryClient.invalidateQueries({ queryKey: ['diet-plan', selectedPlanId] })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => dietPlansService.deleteMealItem(id),
    onSuccess: () => {
      if (selectedPlanId != null)
        queryClient.invalidateQueries({ queryKey: ['diet-plan', selectedPlanId] })
    },
  })

  // Suppress unused warning for updateItemMutation (reserved for future inline edit UX)
  void updateItemMutation

  const openAddPlan = () => {
    setEditingPlan(null)
    setPlanForm(defaultPlanForm)
    setPlanFormError(null)
    setPlanModalOpen(true)
  }

  const openEditPlan = (plan: DietPlanDto) => {
    setEditingPlan(plan)
    setPlanForm({
      planName: plan.planName,
      goalType: plan.goalType,
      calories: plan.calories,
      proteinGrams: plan.proteinGrams ?? undefined,
      carbsGrams: plan.carbsGrams ?? undefined,
      fatsGrams: plan.fatsGrams ?? undefined,
      description: plan.description ?? '',
      isActive: plan.isActive,
    })
    setPlanFormError(null)
    setPlanModalOpen(true)
  }

  const openAddMeal = () => {
    if (selectedPlanId == null) return
    setMealForm({
      mealName: 'Breakfast',
      mealOrder: selectedPlan?.dietMeals?.length ?? 0,
    })
    setMealModalOpen(true)
  }

  const openAddItem = (mealId: number) => {
    setItemMealId(mealId)
    setItemForm({
      foodName: '',
      quantity: '',
      calories: undefined,
      proteinGrams: undefined,
      carbsGrams: undefined,
      fatsGrams: undefined,
    })
    setItemModalOpen(true)
  }

  const handleSubmitPlan = (e: React.FormEvent) => {
    e.preventDefault()
    setPlanFormError(null)
    if (!planForm.planName?.trim()) {
      setPlanFormError('Plan name is required.')
      return
    }
    if (editingPlan) {
      updatePlanMutation.mutate({
        id: editingPlan.id,
        dto: {
          planName: planForm.planName.trim(),
          goalType: planForm.goalType,
          calories: planForm.calories,
          proteinGrams: planForm.proteinGrams ?? undefined,
          carbsGrams: planForm.carbsGrams ?? undefined,
          fatsGrams: planForm.fatsGrams ?? undefined,
          description: planForm.description?.trim() || undefined,
          isActive: planForm.isActive,
        },
      })
    } else {
      createPlanMutation.mutate({
        ...planForm,
        planName: planForm.planName.trim(),
        description: planForm.description?.trim() || undefined,
      })
    }
  }

  const handleSubmitMeal = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPlanId == null) return
    createMealMutation.mutate({
      dietPlanId: selectedPlanId,
      mealName: mealForm.mealName.trim(),
      mealOrder: mealForm.mealOrder,
    })
  }

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (itemMealId == null || !itemForm.foodName.trim()) return
    createItemMutation.mutate({
      dietMealId: itemMealId,
      foodName: itemForm.foodName.trim(),
      quantity: itemForm.quantity.trim() || '—',
      calories: itemForm.calories ?? undefined,
      proteinGrams: itemForm.proteinGrams ?? undefined,
      carbsGrams: itemForm.carbsGrams ?? undefined,
      fatsGrams: itemForm.fatsGrams ?? undefined,
    })
  }

  const handleDeletePlan = (plan: DietPlanDto) => {
    if (!window.confirm(`Delete plan "${plan.planName}"?`)) return
    deletePlanMutation.mutate(plan.id)
  }

  const handleDeleteMeal = (meal: DietMealDto) => {
    if (!window.confirm(`Delete meal "${meal.mealName}"?`)) return
    deleteMealMutation.mutate(meal.id)
  }

  const handleSelectPlan = (id: number) => {
    setSelectedPlanId(id)
    const next = new URLSearchParams(searchParams)
    next.set('planId', String(id))
    setSearchParams(next, { replace: true })
    // Smooth scroll to detail panel
    setTimeout(() => {
      document.getElementById('plan-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const dietListStats = useMemo(() => {
    const total = plans.length
    const active = plans.filter((p) => p.isActive).length
    const mealCount = plans.reduce((s, p) => s + (p.dietMeals?.length ?? 0), 0)
    const avgCal =
      total > 0 ? Math.round(plans.reduce((s, p) => s + p.calories, 0) / total) : 0
    return { total, active, mealCount, avgCal }
  }, [plans])

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return plans.filter((p) => {
      if (goalFilter !== 'all' && p.goalType !== goalFilter) return false
      if (!q) return true
      return (
        p.planName.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [plans, searchQuery, goalFilter])

  return (
    <DashboardLayout userName={userName}>
      <div className="min-w-0 space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">Nutrition · Library</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Diet{' '}
              <span className="bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] bg-clip-text text-transparent">
                plans
              </span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Every plan is a living blueprint — goal type, daily target calories, macro split, and the meals that
              deliver them.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAddPlan}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New plan
            </button>
          </div>
        </div>

        {/* Premium KPI row */}
        <DashboardMetricsGrid cols={4}>
          <PremiumStat
            label="Plans"
            value={dietListStats.total}
            caption={`${dietListStats.active} active`}
            icon={
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            gradient="from-amber-400 to-orange-500"
          />
          <PremiumStat
            label="Avg. calories"
            value={dietListStats.total ? dietListStats.avgCal.toLocaleString() : '—'}
            caption="per plan"
            icon={
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            gradient="from-rose-400 to-pink-500"
          />
          <PremiumStat
            label="Total meals"
            value={dietListStats.mealCount}
            caption="across plans"
            icon={
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            gradient="from-emerald-400 to-teal-500"
          />
          <PremiumStat
            label="Active ratio"
            value={dietListStats.total ? `${Math.round((dietListStats.active / dietListStats.total) * 100)}%` : '—'}
            caption={`${dietListStats.active} / ${dietListStats.total}`}
            icon={
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-3c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
              </svg>
            }
            gradient="from-violet-400 to-fuchsia-500"
          />
        </DashboardMetricsGrid>

        {/* Search + filter bar */}
        <div className="glass-card flex flex-col gap-3 rounded-2xl border border-white/10 p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plans by name or description…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-amber-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill active={goalFilter === 'all'} onClick={() => setGoalFilter('all')} label="All goals" />
            {GOAL_OPTIONS.map((g) => (
              <FilterPill
                key={g}
                active={goalFilter === g}
                onClick={() => setGoalFilter(g)}
                label={goalThemes[g]?.label ?? g}
              />
            ))}
          </div>
        </div>

        {/* Plan Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <EmptyPlans onAdd={openAddPlan} hasQuery={!!searchQuery || goalFilter !== 'all'} />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlanId === plan.id}
                onSelect={() => handleSelectPlan(plan.id)}
                onEdit={() => openEditPlan(plan)}
                onDelete={() => handleDeletePlan(plan)}
              />
            ))}
          </div>
        )}

        {/* Plan Detail — Meals & Items */}
        {selectedPlanId != null && (
          <section
            id="plan-detail-panel"
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(15,12,30,0.65)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300/80">
                  Builder
                </p>
                <h2 className="mt-0.5 truncate text-lg font-semibold text-white">
                  Meals & items{selectedPlan ? ` — ${selectedPlan.planName}` : ''}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPlan && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getGoalTheme(selectedPlan.goalType).bg} ${getGoalTheme(selectedPlan.goalType).text} ${getGoalTheme(selectedPlan.goalType).ring}`}
                  >
                    {getGoalTheme(selectedPlan.goalType).label}
                  </span>
                )}
                <Button onClick={openAddMeal} size="sm">
                  + Add meal
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedPlanId(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              {loadingPlan ? (
                <p className="text-slate-400">Loading…</p>
              ) : selectedPlan ? (
                (selectedPlan.dietMeals ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                    <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                      <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-300">No meals yet. Start by adding breakfast.</p>
                    <button
                      type="button"
                      onClick={openAddMeal}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110"
                    >
                      + Add first meal
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {(selectedPlan.dietMeals ?? [])
                      .slice()
                      .sort((a, b) => a.mealOrder - b.mealOrder)
                      .map((meal) => (
                        <MealPanel
                          key={meal.id}
                          meal={meal}
                          onAddItem={() => openAddItem(meal.id)}
                          onDelete={() => handleDeleteMeal(meal)}
                          onDeleteItem={(itemId) => deleteItemMutation.mutate(itemId)}
                        />
                      ))}
                  </div>
                )
              ) : (
                <p className="text-slate-400">Failed to load plan.</p>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Add/Edit Plan modal */}
      <Modal
        open={planModalOpen}
        onClose={() => {
          setPlanModalOpen(false)
          setEditingPlan(null)
          setPlanForm(defaultPlanForm)
        }}
        title={editingPlan ? 'Edit diet plan' : 'New diet plan'}
      >
        <form onSubmit={handleSubmitPlan} className="flex flex-col gap-4">
          {planFormError && (
            <p
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              role="alert"
            >
              {planFormError}
            </p>
          )}
          <Input
            label="Plan name"
            value={planForm.planName}
            onChange={(e) => setPlanForm((f) => ({ ...f, planName: e.target.value }))}
            placeholder="e.g. High Protein"
            required
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Goal type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map((g) => {
                const t = getGoalTheme(g)
                const active = planForm.goalType === g
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setPlanForm((f) => ({ ...f, goalType: g }))}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? `border-transparent bg-gradient-to-br ${t.gradient} text-white shadow-lg`
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
          <Input
            label="Calories"
            type="number"
            min={0}
            value={planForm.calories === 0 ? '' : String(planForm.calories)}
            onChange={(e) => setPlanForm((f) => ({ ...f, calories: Number(e.target.value) || 0 }))}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Protein (g)"
              type="number"
              min={0}
              value={planForm.proteinGrams ?? ''}
              onChange={(e) =>
                setPlanForm((f) => ({
                  ...f,
                  proteinGrams: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
            <Input
              label="Carbs (g)"
              type="number"
              min={0}
              value={planForm.carbsGrams ?? ''}
              onChange={(e) =>
                setPlanForm((f) => ({
                  ...f,
                  carbsGrams: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
            <Input
              label="Fats (g)"
              type="number"
              min={0}
              value={planForm.fatsGrams ?? ''}
              onChange={(e) =>
                setPlanForm((f) => ({
                  ...f,
                  fatsGrams: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <Input
            label="Description"
            value={planForm.description ?? ''}
            onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={planForm.isActive ?? true}
              onChange={(e) => setPlanForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-400/40"
            />
            <span className="text-sm text-slate-300">Active</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
            >
              {editingPlan ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Meal modal */}
      <Modal open={mealModalOpen} onClose={() => setMealModalOpen(false)} title="Add meal">
        <form onSubmit={handleSubmitMeal} className="flex flex-col gap-4">
          <Input
            label="Meal name"
            value={mealForm.mealName}
            onChange={(e) => setMealForm((f) => ({ ...f, mealName: e.target.value }))}
            placeholder="e.g. Breakfast, Lunch, Dinner"
            required
          />
          <Input
            label="Order"
            type="number"
            min={0}
            value={String(mealForm.mealOrder)}
            onChange={(e) => setMealForm((f) => ({ ...f, mealOrder: Number(e.target.value) || 0 }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setMealModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMealMutation.isPending}>
              Add meal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Meal Item modal */}
      <Modal
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false)
          setItemMealId(null)
        }}
        title="Add food item"
      >
        <form onSubmit={handleSubmitItem} className="flex flex-col gap-4">
          <Input
            label="Food name"
            value={itemForm.foodName}
            onChange={(e) => setItemForm((f) => ({ ...f, foodName: e.target.value }))}
            placeholder="e.g. Oats, Chicken breast"
            required
          />
          <Input
            label="Quantity"
            value={itemForm.quantity}
            onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
            placeholder="e.g. 100g, 2 eggs"
          />
          <Input
            label="Calories"
            type="number"
            min={0}
            value={itemForm.calories ?? ''}
            onChange={(e) =>
              setItemForm((f) => ({
                ...f,
                calories: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Protein (g)"
              type="number"
              min={0}
              step={0.1}
              value={itemForm.proteinGrams ?? ''}
              onChange={(e) =>
                setItemForm((f) => ({
                  ...f,
                  proteinGrams: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
            <Input
              label="Carbs (g)"
              type="number"
              min={0}
              step={0.1}
              value={itemForm.carbsGrams ?? ''}
              onChange={(e) =>
                setItemForm((f) => ({
                  ...f,
                  carbsGrams: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
            <Input
              label="Fats (g)"
              type="number"
              min={0}
              step={0.1}
              value={itemForm.fatsGrams ?? ''}
              onChange={(e) =>
                setItemForm((f) => ({
                  ...f,
                  fatsGrams: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createItemMutation.isPending}>
              Add item
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

/* ----------------------------- Subcomponents ----------------------------- */

function PremiumStat({
  label,
  value,
  caption,
  icon,
  gradient,
}: {
  label: string
  value: string | number
  caption: string
  icon: React.ReactNode
  gradient: string
}) {
  return (
    <div className="group relative h-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-4 transition-all duration-300 sm:hover:-translate-y-0.5 sm:hover:border-white/20">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-30`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1.5 break-words text-xl font-bold leading-tight text-white sm:text-2xl">{value}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{caption}</p>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-amber-400/50 bg-amber-500/15 text-amber-100 shadow-sm shadow-amber-500/10'
          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}

function EmptyPlans({ onAdd, hasQuery }: { onAdd: () => void; hasQuery: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
      <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-xl shadow-orange-500/30">
        <svg className="size-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white">
        {hasQuery ? 'No plans match your filters' : 'No diet plans yet'}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
        {hasQuery
          ? 'Try clearing the search or switching goal type.'
          : 'Kick off your first plan — add goal type, calories, and macros, then stack meals on top.'}
      </p>
      {!hasQuery && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110"
        >
          + Create first plan
        </button>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  plan: DietPlanDto
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const theme = getGoalTheme(plan.goalType)
  const mealCount = plan.dietMeals?.length ?? 0
  const itemCount = (plan.dietMeals ?? []).reduce(
    (s, m) => s + (m.dietMealItems?.length ?? 0),
    0
  )

  // Macro split percentages based on grams
  const p = plan.proteinGrams ?? 0
  const c = plan.carbsGrams ?? 0
  const f = plan.fatsGrams ?? 0
  const macroTotal = p + c + f
  const pp = macroTotal ? Math.round((p / macroTotal) * 100) : 0
  const pc = macroTotal ? Math.round((c / macroTotal) * 100) : 0
  const pf = macroTotal ? Math.max(0, 100 - pp - pc) : 0

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-[rgba(17,17,39,0.6)] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        selected
          ? 'border-amber-400/60 shadow-lg shadow-amber-500/20'
          : 'border-white/10 hover:border-white/25'
      }`}
    >
      {/* Top accent bar */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${theme.gradient}`}
      />
      {/* Glow blob */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br ${theme.gradient} opacity-15 blur-3xl transition-opacity group-hover:opacity-25`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${theme.bg} ${theme.text} ${theme.ring}`}
            >
              {theme.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                plan.isActive
                  ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30'
                  : 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/20'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  plan.isActive ? 'bg-emerald-400' : 'bg-slate-400'
                }`}
              />
              {plan.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <h3 className="mt-2 truncate text-lg font-semibold text-white">{plan.planName}</h3>
          {plan.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{plan.description}</p>
          )}
        </div>
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.gradient} text-white shadow-lg`}
        >
          <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      {/* Calorie highlight */}
      <div className="mt-4 flex items-end gap-2">
        <span className="text-4xl font-black leading-none tracking-tight text-white">
          {plan.calories.toLocaleString()}
        </span>
        <span className="pb-1 text-xs font-medium uppercase tracking-wider text-slate-400">kcal / day</span>
      </div>

      {/* Macro bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Macro split</span>
          <span className="normal-case tracking-normal text-slate-500">
            {macroTotal ? `${macroTotal}g total` : 'Not set'}
          </span>
        </div>
        {macroTotal > 0 ? (
          <>
            <div className="flex h-2 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
              <div className="bg-gradient-to-r from-rose-400 to-red-500" style={{ width: `${pp}%` }} />
              <div className="bg-gradient-to-r from-sky-400 to-indigo-500" style={{ width: `${pc}%` }} />
              <div className="bg-gradient-to-r from-violet-400 to-fuchsia-500" style={{ width: `${pf}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
              <MacroLegend color="bg-rose-400" label="Protein" value={`${p}g · ${pp}%`} />
              <MacroLegend color="bg-sky-400" label="Carbs" value={`${c}g · ${pc}%`} />
              <MacroLegend color="bg-violet-400" label="Fats" value={`${f}g · ${pf}%`} />
            </div>
          </>
        ) : (
          <div className="h-2 rounded-full border border-dashed border-white/10" />
        )}
      </div>

      {/* Footer stats + actions */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
            </svg>
            <strong className="font-semibold text-white">{mealCount}</strong> meals
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <strong className="font-semibold text-white">{itemCount}</strong> foods
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Edit" onClick={onEdit}>
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </IconBtn>
          <IconBtn label="Delete" onClick={onDelete} danger>
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </IconBtn>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          selected
            ? `bg-gradient-to-br ${theme.gradient} text-white shadow-lg`
            : 'border border-white/10 bg-white/5 text-slate-100 hover:border-white/25 hover:bg-white/10'
        }`}
      >
        {selected ? 'Currently managing' : 'Manage meals & items'}
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </button>
    </div>
  )
}

function MacroLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${color}`} aria-hidden />
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200">{value}</span>
    </span>
  )
}

function IconBtn({
  children,
  onClick,
  label,
  danger = false,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex size-8 items-center justify-center rounded-lg border transition ${
        danger
          ? 'border-rose-500/20 bg-rose-500/5 text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/15'
          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function MealPanel({
  meal,
  onAddItem,
  onDelete,
  onDeleteItem,
}: {
  meal: DietMealDto
  onAddItem: () => void
  onDelete: () => void
  onDeleteItem: (id: number) => void
}) {
  const items = meal.dietMealItems ?? []
  const totalCal = items.reduce((s, i) => s + (i.calories ?? 0), 0)
  const totalP = items.reduce((s, i) => s + (i.proteinGrams ?? 0), 0)
  const totalC = items.reduce((s, i) => s + (i.carbsGrams ?? 0), 0)
  const totalF = items.reduce((s, i) => s + (i.fatsGrams ?? 0), 0)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-xl shadow-lg">
            <span aria-hidden>{getMealIcon(meal.mealName)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">{meal.mealName}</h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Order {meal.mealOrder}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {items.length} food{items.length !== 1 ? 's' : ''}
              {totalCal > 0 ? ` · ~${totalCal} cal` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1 rounded-lg bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-110"
          >
            + Food
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete meal"
            className="inline-flex size-7 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/15"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-5 text-center text-xs text-slate-500">
            No foods added yet. Click + Food to start.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/5">
            {items.map((item) => (
              <li
                key={item.id}
                className="group/food flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="truncate text-sm font-semibold text-white">{item.foodName}</span>
                    <span className="text-xs text-slate-400">{item.quantity || '—'}</span>
                  </div>
                  {(item.calories != null ||
                    item.proteinGrams != null ||
                    item.carbsGrams != null ||
                    item.fatsGrams != null) && (
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                      {item.calories != null && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-200 ring-1 ring-amber-400/25">
                          {item.calories} cal
                        </span>
                      )}
                      {item.proteinGrams != null && (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-medium text-rose-200 ring-1 ring-rose-400/25">
                          P {item.proteinGrams}g
                        </span>
                      )}
                      {item.carbsGrams != null && (
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 font-medium text-sky-200 ring-1 ring-sky-400/25">
                          C {item.carbsGrams}g
                        </span>
                      )}
                      {item.fatsGrams != null && (
                        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-medium text-violet-200 ring-1 ring-violet-400/25">
                          F {item.fatsGrams}g
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remove "${item.foodName}"?`)) onDeleteItem(item.id)
                  }}
                  aria-label={`Remove ${item.foodName}`}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 opacity-70 transition hover:bg-rose-500/10 hover:text-rose-300 hover:opacity-100"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (totalP > 0 || totalC > 0 || totalF > 0) && (
          <div className="mt-4 flex flex-wrap justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-slate-300">
            <span className="font-semibold uppercase tracking-wider text-slate-400">Meal total</span>
            <span className="flex flex-wrap gap-2">
              <span className="text-amber-200">{totalCal} cal</span>
              <span className="text-rose-200">P {totalP.toFixed(1)}g</span>
              <span className="text-sky-200">C {totalC.toFixed(1)}g</span>
              <span className="text-violet-200">F {totalF.toFixed(1)}g</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
