import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { dietPlansService } from '../services/dietPlans.service'
import { userDietPlansService } from '../services/userDietPlans.service'
import type {
  DietPlanDto,
  DietMealDto,
  DietMealItemDto,
  CreateDietMealItemDto,
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

const defaultMealForm = { dietPlanId: 0, mealName: '', mealOrder: 0 }
const defaultItemForm: CreateDietMealItemDto & { dietPlanId: number } = {
  dietPlanId: 0,
  dietMealId: 0,
  foodName: '',
  quantity: '',
  calories: undefined,
  proteinGrams: undefined,
  carbsGrams: undefined,
  fatsGrams: undefined,
}

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 transition-colors focus:border-amber-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-amber-400/20'

const labelClass =
  'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'

interface HubLink {
  type: 'link'
  path: string
  label: string
  description: string
  gradient: string
  accent: string
  glow: string
  icon: ReactNode
}

interface HubAction {
  type: 'action'
  key: string
  label: string
  description: string
  gradient: string
  accent: string
  glow: string
  icon: ReactNode
  onClick: () => void
}

type HubItem = HubLink | HubAction

export function DietPlansDashboardPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [mealForm, setMealForm] = useState(defaultMealForm)
  const [mealFormError, setMealFormError] = useState<string | null>(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemForm, setItemForm] = useState(defaultItemForm)
  const [itemFormError, setItemFormError] = useState<string | null>(null)

  const { data: plans = [] } = useQuery({
    queryKey: ['diet-plans'],
    queryFn: async () => {
      const { data } = await dietPlansService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['user-diet-plans'],
    queryFn: async () => {
      const { data } = await userDietPlansService.getAssignments()
      return Array.isArray(data) ? data : []
    },
  })

  const stats = useMemo(() => {
    const total = plans.length
    const active = plans.filter((p) => p.isActive).length
    const mealCount = plans.reduce((s, p) => s + (p.dietMeals?.length ?? 0), 0)
    const itemCount = plans.reduce(
      (s, p) =>
        s +
        (p.dietMeals ?? []).reduce((m, meal) => m + (meal.dietMealItems?.length ?? 0), 0),
      0
    )
    const avgCal =
      total > 0 ? Math.round(plans.reduce((s, p) => s + p.calories, 0) / total) : 0
    const assignedActive = assignments.filter((a) => a.isActive).length
    return { total, active, mealCount, itemCount, avgCal, assignedActive }
  }, [plans, assignments])

  const createMealMutation = useMutation({
    mutationFn: (dto: { dietPlanId: number; mealName: string; mealOrder: number }) =>
      dietPlansService.createMeal(dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['diet-plans'] })
      queryClient.invalidateQueries({ queryKey: ['diet-plan', variables.dietPlanId] })
      setMealModalOpen(false)
      setMealForm(defaultMealForm)
      setMealFormError(null)
      navigate(`/dashboard/diet-plans/list?planId=${variables.dietPlanId}`, { replace: false })
    },
    onError: (err: Error) => setMealFormError(err.message || 'Failed to add meal'),
  })

  const handleSubmitMeal = (e: React.FormEvent) => {
    e.preventDefault()
    setMealFormError(null)
    if (!mealForm.dietPlanId) {
      setMealFormError('Please select a diet plan.')
      return
    }
    if (!mealForm.mealName.trim()) {
      setMealFormError('Please enter a meal name.')
      return
    }
    createMealMutation.mutate(mealForm)
  }

  const selectedPlanIdForItem = itemForm.dietPlanId || undefined
  const { data: selectedPlanForItem, refetch: refetchPlanForItem } = useQuery({
    queryKey: ['diet-plan', selectedPlanIdForItem],
    queryFn: async () => {
      if (!selectedPlanIdForItem) return null
      const { data } = await dietPlansService.getById(selectedPlanIdForItem)
      return data
    },
    enabled: !!selectedPlanIdForItem && itemModalOpen,
    staleTime: 0,
  })
  const mealsForItem = (selectedPlanForItem?.dietMeals ?? []) as DietMealDto[]

  useEffect(() => {
    if (itemModalOpen && selectedPlanIdForItem) refetchPlanForItem()
  }, [itemModalOpen, selectedPlanIdForItem, refetchPlanForItem])

  const createItemMutation = useMutation({
    mutationFn: (dto: CreateDietMealItemDto) => dietPlansService.createMealItem(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet-plans'] })
      queryClient.invalidateQueries({ queryKey: ['diet-plan', itemForm.dietPlanId] })
      refetchPlanForItem()
      setItemForm((f) => ({
        ...f,
        foodName: '',
        quantity: '',
        calories: undefined,
        proteinGrams: undefined,
        carbsGrams: undefined,
        fatsGrams: undefined,
      }))
      setItemFormError(null)
    },
    onError: (err: Error) => setItemFormError(err.message || 'Failed to add food item'),
  })

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault()
    setItemFormError(null)
    if (!itemForm.dietMealId) {
      setItemFormError('Please select a meal.')
      return
    }
    if (!itemForm.foodName?.trim()) {
      setItemFormError('Please enter a food name.')
      return
    }
    createItemMutation.mutate({
      dietMealId: itemForm.dietMealId,
      foodName: itemForm.foodName.trim(),
      quantity: itemForm.quantity?.trim() || '',
      calories: itemForm.calories ?? undefined,
      proteinGrams: itemForm.proteinGrams ?? undefined,
      carbsGrams: itemForm.carbsGrams ?? undefined,
      fatsGrams: itemForm.fatsGrams ?? undefined,
    })
  }

  const hubItems: HubItem[] = [
    {
      type: 'link',
      path: '/dashboard/diet-plans/list',
      label: 'Plan Library',
      description: 'Build, edit, and curate diet plans with meals and macros.',
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
      accent: 'text-amber-300',
      glow: 'shadow-amber-500/30',
      icon: (
        <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v5h5M8 13h8M8 17h5" />
        </svg>
      ),
    },
    {
      type: 'link',
      path: '/dashboard/diet-plans/assign',
      label: 'Assign to Members',
      description: 'Link plans to clients, track start & end, and monitor activity.',
      gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
      accent: 'text-emerald-300',
      glow: 'shadow-emerald-500/30',
      icon: (
        <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      type: 'action',
      key: 'add-meal',
      label: 'Quick-Add Meal',
      description: 'Append a meal slot to an existing plan without leaving this page.',
      gradient: 'from-rose-400 via-pink-500 to-fuchsia-500',
      accent: 'text-rose-300',
      glow: 'shadow-rose-500/30',
      onClick: () => setMealModalOpen(true),
      icon: (
        <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      type: 'action',
      key: 'add-item',
      label: 'Quick-Add Food',
      description: 'Drop a food item with macros into any meal, instantly.',
      gradient: 'from-indigo-400 via-violet-500 to-purple-500',
      accent: 'text-violet-300',
      glow: 'shadow-violet-500/30',
      onClick: () => setItemModalOpen(true),
      icon: (
        <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a4 4 0 00-8 0m8 0a4 4 0 11-8 0m8 0h-8M7 5a2 2 0 114 0 2 2 0 01-4 0zM3 21h18M7 12h4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7v14" />
        </svg>
      ),
    },
  ]

  return (
    <DashboardLayout userName={userName}>
      <div className="min-w-0 space-y-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,12,30,0.7)] p-8 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-rose-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 bottom-0 size-64 rounded-full bg-gradient-to-tr from-emerald-400/20 via-teal-500/15 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
          />

          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-200">
                <span className="size-1.5 rounded-full bg-amber-300" />
                Nutrition Studio
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Diet{' '}
                <span className="bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] bg-clip-text text-transparent">
                  Plans
                </span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300/90 sm:text-base">
                Craft precision nutrition for every goal. Design plans, stack meals, log macros,
                and roll them out to members — all from one control room.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/dashboard/diet-plans/list"
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#fbbf24_0%,#fb923c_50%,#f43f5e_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110"
                >
                  Browse plan library
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  to="/dashboard/diet-plans/assign"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:bg-white/10"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Assign to members
                </Link>
              </div>
            </div>

            {/* Floating stat tiles */}
            <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:max-w-sm">
              <HeroStat
                label="Plans"
                value={stats.total}
                sublabel={`${stats.active} active`}
                ring="ring-amber-400/30"
                gradient="from-amber-400 to-orange-500"
              />
              <HeroStat
                label="Total meals"
                value={stats.mealCount}
                sublabel={`${stats.itemCount} foods`}
                ring="ring-rose-400/30"
                gradient="from-rose-400 to-pink-500"
              />
              <HeroStat
                label="Avg. calories"
                value={stats.total ? stats.avgCal.toLocaleString() : '—'}
                sublabel="per plan"
                ring="ring-emerald-400/30"
                gradient="from-emerald-400 to-teal-500"
              />
              <HeroStat
                label="Active assigns"
                value={stats.assignedActive}
                sublabel={`of ${assignments.length}`}
                ring="ring-violet-400/30"
                gradient="from-violet-400 to-fuchsia-500"
              />
            </div>
          </div>
        </section>

        {/* HUB GRID */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Workspaces</h2>
              <p className="text-sm text-slate-400">Pick a destination or take a quick action.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {hubItems.map((item) => (
              <HubCard key={item.type === 'link' ? item.path : item.key} item={item} />
            ))}
          </div>
        </section>
      </div>

      {/* Quick-Add Meal */}
      <Modal
        open={mealModalOpen}
        onClose={() => {
          setMealModalOpen(false)
          setMealFormError(null)
        }}
        title="Quick-add diet meal"
      >
        <form onSubmit={handleSubmitMeal} className="flex flex-col gap-4">
          {mealFormError && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {mealFormError}
            </p>
          )}
          <div>
            <label className={labelClass}>Diet plan</label>
            <select
              aria-label="Select diet plan"
              value={mealForm.dietPlanId || ''}
              onChange={(e) =>
                setMealForm((f) => ({ ...f, dietPlanId: Number(e.target.value) }))
              }
              className={selectClass}
              required
            >
              <option value="" className="bg-slate-900">
                Select plan
              </option>
              {(plans as DietPlanDto[]).map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.planName} ({p.calories} cal)
                </option>
              ))}
            </select>
          </div>
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
            onChange={(e) =>
              setMealForm((f) => ({
                ...f,
                mealOrder: Number(e.target.value) || 0,
              }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setMealModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMealMutation.isPending}>
              {createMealMutation.isPending ? 'Adding…' : 'Add meal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick-Add Food Item */}
      <Modal
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false)
          setItemForm(defaultItemForm)
          setItemFormError(null)
        }}
        title="Quick-add food item"
        size="wide"
      >
        <form onSubmit={handleSubmitItem} className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {itemFormError && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {itemFormError}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Diet plan</label>
                <select
                  aria-label="Select diet plan"
                  value={itemForm.dietPlanId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    setItemForm((f) => ({ ...f, dietPlanId: id, dietMealId: 0 }))
                  }}
                  className={selectClass}
                  required
                >
                  <option value="" className="bg-slate-900">
                    Select plan
                  </option>
                  {(plans as DietPlanDto[]).map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">
                      {p.planName} ({p.calories} cal)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Meal</label>
                <select
                  aria-label="Select meal"
                  value={itemForm.dietMealId || ''}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, dietMealId: Number(e.target.value) }))
                  }
                  className={selectClass}
                  required
                  disabled={!itemForm.dietPlanId || mealsForItem.length === 0}
                >
                  <option value="" className="bg-slate-900">
                    {!itemForm.dietPlanId
                      ? 'Select a plan first'
                      : mealsForItem.length === 0
                        ? 'No meals in this plan'
                        : 'Select meal'}
                  </option>
                  {mealsForItem
                    .sort((a, b) => a.mealOrder - b.mealOrder)
                    .map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900">
                        {m.mealName} (order: {m.mealOrder})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <Input
              label="Food name"
              value={itemForm.foodName ?? ''}
              onChange={(e) => setItemForm((f) => ({ ...f, foodName: e.target.value }))}
              placeholder="e.g. Oats, Chicken breast"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity"
                value={itemForm.quantity ?? ''}
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
            </div>
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
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setItemModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createItemMutation.isPending}>
                {createItemMutation.isPending ? 'Adding…' : 'Add food item'}
              </Button>
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-72">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              Already in this meal
            </h3>
            {itemForm.dietMealId > 0 ? (
              (() => {
                const selectedMeal = mealsForItem.find((m) => m.id === itemForm.dietMealId)
                const existingItems = (selectedMeal?.dietMealItems ?? []) as DietMealItemDto[]
                return (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="mb-2 text-xs text-slate-400">
                      {existingItems.length} item{existingItems.length !== 1 ? 's' : ''}
                    </p>
                    {existingItems.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No food items yet. Add one with the form.
                      </p>
                    ) : (
                      <ul className="max-h-[280px] space-y-1.5 overflow-y-auto text-sm text-slate-200">
                        {existingItems.map((item) => (
                          <li
                            key={item.id}
                            className="flex flex-col gap-0.5 border-b border-white/5 pb-1.5 last:border-0"
                          >
                            <span>
                              <strong className="text-white">{item.foodName}</strong>
                              {item.quantity && ` — ${item.quantity}`}
                            </span>
                            {(item.calories != null ||
                              item.proteinGrams != null ||
                              item.carbsGrams != null ||
                              item.fatsGrams != null) && (
                              <span className="text-xs text-slate-400">
                                {[
                                  item.calories != null && `${item.calories} cal`,
                                  item.proteinGrams != null && `P: ${item.proteinGrams}g`,
                                  item.carbsGrams != null && `C: ${item.carbsGrams}g`,
                                  item.fatsGrams != null && `F: ${item.fatsGrams}g`,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })()
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400">
                Select a plan and meal to see existing items.
              </p>
            )}
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

function HeroStat({
  label,
  value,
  sublabel,
  ring,
  gradient,
}: {
  label: string
  value: string | number
  sublabel: string
  ring: string
  gradient: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 ring-1 ${ring} backdrop-blur-xl`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl`}
      />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">{sublabel}</p>
    </div>
  )
}

function HubCard({ item }: { item: HubItem }) {
  const content = (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-2xl ${item.glow}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-gradient-to-br ${item.gradient} opacity-15 blur-2xl transition-opacity group-hover:opacity-30`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${item.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
      />

      <div
        className={`mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg`}
      >
        {item.icon}
      </div>
      <h3 className="text-base font-semibold text-white">{item.label}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.description}</p>

      <div className="mt-auto flex items-center justify-between pt-6">
        <span className={`text-xs font-semibold uppercase tracking-wider ${item.accent}`}>
          {item.type === 'link' ? 'Open' : 'Quick action'}
        </span>
        <span
          className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:bg-white/10 group-hover:text-white"
          aria-hidden
        >
          {item.type === 'link' ? (
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          ) : (
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        </span>
      </div>
    </div>
  )

  if (item.type === 'link') {
    return (
      <Link to={item.path} className="block">
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={item.onClick} className="block w-full text-left">
      {content}
    </button>
  )
}
