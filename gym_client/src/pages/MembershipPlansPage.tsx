import { useEffect, useState, useMemo } from 'react'
import { useClientPagination } from '../hooks/useClientPagination'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { DataPageSection } from '../components/layout/DataPageShell'
import {
  EnterpriseDataGrid,
  RowActionsMenu,
  type DataGridColumnDef,
} from '../components/data-grid'
import { DashboardMetricsGrid } from '../components/layout/DashboardMetricsGrid'
import { MetricCard } from '../components/dashboard/MetricCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { membershipPlansService } from '../services/membershipPlans.service'
import { branchesService, type PlanBranchPriceSetting } from '../services/branches.service'
import { formatInr, formatInrWhole } from '../lib/formatInr'
import type {
  MembershipPlan,
  CreateMembershipPlanDto,
  UpdateMembershipPlanDto,
} from '../types/membershipPlan'

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

const defaultCreate: CreateMembershipPlanDto = {
  planName: '',
  durationDays: 30,
  price: 0,
  description: '',
}

const planMetricIcons = {
  list: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  rupee: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  calendar: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
}

export function MembershipPlansPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MembershipPlan | null>(null)
  const [form, setForm] = useState<CreateMembershipPlanDto>(defaultCreate)
  const [formError, setFormError] = useState<string | null>(null)
  const [pricingPlan, setPricingPlan] = useState<MembershipPlan | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data } = await membershipPlansService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateMembershipPlanDto) => membershipPlansService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] })
      setModalOpen(false)
      setForm(defaultCreate)
      setFormError(null)
      toast.success('Plan created successfully.')
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to create plan'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateMembershipPlanDto }) =>
      membershipPlansService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] })
      setModalOpen(false)
      setEditing(null)
      setForm(defaultCreate)
      setFormError(null)
      toast.success('Successfully updated the plan.')
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to update plan'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => membershipPlansService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['membership-plans'] }),
  })

  const planStats = useMemo(() => {
    const total = plans.length
    if (total === 0) return { total: 0, avgPrice: 0, avgDays: 0 }
    const sumPrice = plans.reduce((s, p) => s + p.price, 0)
    const sumDays = plans.reduce((s, p) => s + p.durationDays, 0)
    return {
      total,
      avgPrice: sumPrice / total,
      avgDays: Math.round((sumDays / total) * 10) / 10,
    }
  }, [plans])

  const { pageItems: pagedPlans, totalCount } = useClientPagination(plans, page, pageSize)

  const openAdd = () => {
    setEditing(null)
    setForm(defaultCreate)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (plan: MembershipPlan) => {
    setEditing(plan)
    setForm({
      planName: plan.planName,
      durationDays: plan.durationDays,
      price: plan.price,
      description: plan.description ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(defaultCreate)
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.planName?.trim()) {
      setFormError('Plan name is required.')
      return
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        dto: {
          planName: form.planName.trim(),
          durationDays: form.durationDays,
          price: form.price,
          description: form.description?.trim() || undefined,
        },
      })
    } else {
      createMutation.mutate({
        planName: form.planName.trim(),
        durationDays: form.durationDays,
        price: form.price,
        description: form.description?.trim() || undefined,
      })
    }
  }

  const handleDelete = (plan: MembershipPlan) => {
    if (!window.confirm(`Delete plan "${plan.planName}"?`)) return
    deleteMutation.mutate(plan.id)
  }

  const planColumns = useMemo<DataGridColumnDef<MembershipPlan>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        sticky: true,
        minWidth: 180,
        width: 220,
        sortable: true,
        accessorFn: (p) => p.planName,
        cell: ({ row }) => <span className="font-medium text-white">{row.planName}</span>,
      },
      {
        id: 'duration',
        header: 'Duration',
        minWidth: 100,
        width: 110,
        sortable: true,
        align: 'right',
        accessorFn: (p) => p.durationDays,
        cell: ({ row }) => <span className="tabular-nums">{row.durationDays} d</span>,
      },
      {
        id: 'price',
        header: 'Price',
        minWidth: 110,
        width: 120,
        sortable: true,
        align: 'right',
        accessorFn: (p) => p.price,
        cell: ({ row }) => formatInr(row.price),
      },
      {
        id: 'description',
        header: 'Description',
        minWidth: 160,
        width: 200,
        hideBelow: 'md',
        accessorFn: (p) => p.description ?? '',
        cell: ({ value }) => (
          <span className="block truncate text-slate-300">{String(value) || '—'}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        width: 72,
        minWidth: 72,
        align: 'right',
        cell: ({ row }) => (
          <RowActionsMenu
            row={row}
            actions={[
              { id: 'edit', label: 'Edit', onClick: openEdit },
              { id: 'prices', label: 'Branch prices', onClick: setPricingPlan },
              { id: 'delete', label: 'Delete', variant: 'danger', onClick: handleDelete },
            ]}
          />
        ),
      },
    ],
    [handleDelete, openEdit],
  )

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Catalog"
        titleGradient="membership plans"
        subtitle="Shared plans. Branch prices and availability are set per gym and used at sale time."
        primaryAction={{ label: '+ Add plan', onClick: openAdd }}
      >
        <DataPageSection>
        <DashboardMetricsGrid cols={3}>
          <MetricCard
            title="Plans defined"
            value={planStats.total}
            gradient="from-blue-500 to-indigo-500"
            icon={planMetricIcons.list}
            caption="In catalog"
          />
          <MetricCard
            title="Avg. price"
            value={planStats.total ? formatInrWhole(planStats.avgPrice) : '—'}
            gradient="from-violet-500 to-fuchsia-500"
            icon={planMetricIcons.rupee}
            caption="Across all plans"
          />
          <MetricCard
            title="Avg. duration"
            value={planStats.total ? `${planStats.avgDays} d` : '—'}
            gradient="from-sky-400 to-blue-500"
            icon={planMetricIcons.calendar}
            caption="Mean plan length"
          />
        </DashboardMetricsGrid>
        </DataPageSection>

        <DashboardTablePanel
          title="Plan list"
          description="Edit or remove plans. Members reference these when assigned a subscription."
        >
          <EnterpriseDataGrid
            data={pagedPlans}
            columns={planColumns}
            getRowId={(p) => p.id}
            loading={isLoading}
            emptyMessage="No plans yet. Add one to get started."
            pagination={
              totalCount > 0
                ? {
                    page,
                    pageSize,
                    totalCount,
                    onPageChange: setPage,
                    onPageSizeChange: (size) => {
                      setPageSize(size)
                      setPage(1)
                    },
                  }
                : undefined
            }
          />
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit plan' : 'Add plan'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
              {formError}
            </p>
          )}
          <Input
            label="Plan name"
            value={form.planName}
            onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
            placeholder="e.g. Monthly, Quarterly, Yearly"
            required
          />
          <Input
            label="Duration (days)"
            type="number"
            min={1}
            value={String(form.durationDays)}
            onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) || 30 }))}
          />
          <Input
            label="Price (₹)"
            type="number"
            min={0}
            step={0.01}
            value={form.price === 0 ? '' : String(form.price)}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
          />
          <Input
            label="Description"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
      <BranchPlanPricesModal plan={pricingPlan} onClose={() => setPricingPlan(null)} />
    </DashboardLayout>
  )
}

function BranchPlanPricesModal({ plan, onClose }: { plan: MembershipPlan | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<number, { price: string; isAvailable: boolean }>>({})
  const [error, setError] = useState<string | null>(null)

  const pricesQuery = useQuery({
    queryKey: ['plan-branch-prices', plan?.id],
    enabled: plan != null,
    queryFn: async () => (await branchesService.planPrices(plan!.id)).data,
  })

  useEffect(() => {
    const next: Record<number, { price: string; isAvailable: boolean }> = {}
    for (const row of pricesQuery.data ?? []) {
      next[row.branchId] = {
        price: row.price == null ? '' : String(row.price),
        isAvailable: row.isAvailable,
      }
    }
    setDrafts(next)
  }, [pricesQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (row: PlanBranchPriceSetting) => {
      const draft = drafts[row.branchId]
      const price = Number(draft?.price)
      if (!Number.isFinite(price) || price < 0) throw new Error('Enter a price of zero or more.')
      await branchesService.savePlanPrice({
        planId: plan!.id,
        branchId: row.branchId,
        price,
        isAvailable: draft?.isAvailable ?? false,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plan-branch-prices', plan?.id] })
      setError(null)
      toast.success('Branch price saved.')
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'Could not save the branch price.'),
  })

  return (
    <Modal open={plan != null} onClose={onClose} title={plan ? `${plan.planName} branch prices` : 'Branch prices'} size="wide" scrollable>
      <div className="space-y-3 text-sm">
        <p className="text-slate-400">
          The catalog price is used only while this plan has no branch prices. After a branch price exists, a sale at another branch needs its own price. Unavailable branches are not offered.
        </p>
        {error ? <p className="text-rose-300">{error}</p> : null}
        {(pricesQuery.data ?? []).map((row) => {
          const draft = drafts[row.branchId] ?? { price: '', isAvailable: false }
          return (
            <div key={row.branchId} className="grid items-end gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[1fr_140px_auto_auto]">
              <div>
                <p className="font-medium text-white">{row.branchName}</p>
                <p className="text-xs text-slate-500">{row.branchActive ? 'Active' : 'Inactive'}{row.isConfigured ? '' : ' · catalog price until saved'}</p>
              </div>
              <Input
                label="Price (₹)"
                type="number"
                min={0}
                step={0.01}
                value={draft.price}
                onChange={(e) =>
                  setDrafts((current) => ({ ...current, [row.branchId]: { ...draft, price: e.target.value } }))
                }
              />
              <label className="mb-2 flex items-center gap-2 text-slate-200">
                <input
                  type="checkbox"
                  checked={draft.isAvailable}
                  onChange={(e) =>
                    setDrafts((current) => ({ ...current, [row.branchId]: { ...draft, isAvailable: e.target.checked } }))
                  }
                />
                Available
              </label>
              <Button type="button" size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(row)}>
                Save
              </Button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
