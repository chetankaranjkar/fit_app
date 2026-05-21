import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { MetricCard } from '../components/dashboard/MetricCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { couponsService } from '../services/coupons.service'
import { formatInr } from '../lib/formatInr'
import { getApiErrorMessage } from '../lib/apiErrors'
import type {
  Coupon,
  CreateCouponDto,
  UpdateCouponDto,
  CouponUsage,
  CouponAnalytics,
  DiscountType,
  CouponStatus,
} from '../types/coupon'

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

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

const statusColors: Record<CouponStatus, string> = {
  Active: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  Expired: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
  Disabled: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
}

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'
const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

const defaultForm: CreateCouponDto = {
  couponCode: '',
  couponName: '',
  description: '',
  discountType: 'Percentage',
  discountValue: 0,
  minimumInvoiceAmount: 0,
  maximumDiscountAmount: null,
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: '',
  usageLimit: 100,
  perUserLimit: 1,
}

export function CouponsPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CreateCouponDto>(defaultForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [usageModal, setUsageModal] = useState<number | null>(null)

  // Queries
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons', search, statusFilter],
    queryFn: async () => {
      const { data } = await couponsService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
      })
      return data
    },
  })

  const { data: analytics } = useQuery<CouponAnalytics>({
    queryKey: ['coupon-analytics'],
    queryFn: async () => {
      const { data } = await couponsService.getAnalytics()
      return data
    },
  })

  const { data: usages = [], isLoading: usagesLoading } = useQuery<CouponUsage[]>({
    queryKey: ['coupon-usages', usageModal],
    queryFn: async () => {
      const { data } = await couponsService.getUsages(usageModal!)
      return data
    },
    enabled: usageModal != null,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const dto: CreateCouponDto = {
        ...form,
        couponCode: form.couponCode.trim().toUpperCase(),
        validFrom: new Date(`${form.validFrom}T00:00:00`).toISOString(),
        validTo: new Date(`${form.validTo}T23:59:59`).toISOString(),
      }
      const { data } = await couponsService.create(dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      queryClient.invalidateQueries({ queryKey: ['coupon-analytics'] })
      toast.success('Coupon created successfully')
      closeModal()
    },
    onError: (err: unknown) => setFormError(getApiErrorMessage(err, 'Failed to create coupon')),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return
      const dto: UpdateCouponDto = {
        couponName: form.couponName,
        description: form.description,
        discountType: form.discountType,
        discountValue: form.discountValue,
        minimumInvoiceAmount: form.minimumInvoiceAmount,
        maximumDiscountAmount: form.maximumDiscountAmount,
        validFrom: new Date(`${form.validFrom}T00:00:00`).toISOString(),
        validTo: new Date(`${form.validTo}T23:59:59`).toISOString(),
        usageLimit: form.usageLimit,
        perUserLimit: form.perUserLimit,
      }
      const { data } = await couponsService.update(editing.id, dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      queryClient.invalidateQueries({ queryKey: ['coupon-analytics'] })
      toast.success('Coupon updated')
      closeModal()
    },
    onError: (err: unknown) => setFormError(getApiErrorMessage(err, 'Failed to update coupon')),
  })

  const disableMutation = useMutation({
    mutationFn: (id: number) => couponsService.disable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      queryClient.invalidateQueries({ queryKey: ['coupon-analytics'] })
      toast.success('Coupon disabled')
    },
  })

  // Handlers
  const openCreate = () => {
    setEditing(null)
    setForm(defaultForm)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (c: Coupon) => {
    setEditing(c)
    setForm({
      couponCode: c.couponCode,
      couponName: c.couponName,
      description: c.description ?? '',
      discountType: c.discountType,
      discountValue: c.discountValue,
      minimumInvoiceAmount: c.minimumInvoiceAmount,
      maximumDiscountAmount: c.maximumDiscountAmount ?? null,
      validFrom: c.validFrom.slice(0, 10),
      validTo: c.validTo.slice(0, 10),
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.couponCode.trim()) return setFormError('Coupon code is required.')
    if (!form.couponName.trim()) return setFormError('Coupon name is required.')
    if (form.discountValue <= 0) return setFormError('Discount value must be > 0.')
    if (!form.validTo) return setFormError('Expiry date is required.')
    if (new Date(form.validTo) <= new Date(form.validFrom))
      return setFormError('Valid To must be after Valid From.')
    if (form.usageLimit < 1) return setFormError('Usage limit must be at least 1.')

    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  const handleDisable = (c: Coupon) => {
    if (!window.confirm(`Disable coupon "${c.couponCode}"?`)) return
    disableMutation.mutate(c.id)
  }

  const icons = {
    active: (
      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    discount: (
      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    expired: (
      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Billing"
        titleGradient="Coupons & Promo Codes"
        subtitle="Create and manage promotional coupons for membership payments."
        primaryAction={{ label: '+ Create Coupon', onClick: openCreate }}
        showExport={false}
      >
        {/* Analytics Cards */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            title="Active"
            value={analytics?.activeCoupons ?? 0}
            gradient="from-emerald-400 to-teal-500"
            icon={icons.active}
            caption="Active coupons"
          />
          <MetricCard
            title="Expired"
            value={analytics?.expiredCoupons ?? 0}
            gradient="from-slate-400 to-slate-500"
            icon={icons.expired}
            caption="Expired coupons"
          />
          <MetricCard
            title="Total Discount"
            value={analytics ? formatInr(analytics.totalDiscountGiven) : '—'}
            gradient="from-violet-500 to-fuchsia-500"
            icon={icons.discount}
            caption="Given via coupons"
          />
          <MetricCard
            title="Most Used"
            value={analytics?.mostUsedCoupon?.couponCode ?? '—'}
            gradient="from-amber-400 to-orange-500"
            icon={icons.discount}
            caption={analytics?.mostUsedCoupon ? `${analytics.mostUsedCoupon.usedCount} uses` : 'No data'}
          />
          <MetricCard
            title="Revenue after discount"
            value={analytics?.revenueAfterDiscount != null ? formatInr(analytics.revenueAfterDiscount) : '—'}
            gradient="from-blue-500 to-indigo-500"
            icon={icons.active}
            caption="Collected on billed memberships"
          />
          <MetricCard
            title="Conversion"
            value={
              analytics?.couponConversionRate != null
                ? `${analytics.couponConversionRate.toFixed(1)}%`
                : '—'
            }
            gradient="from-rose-400 to-pink-500"
            icon={icons.discount}
            caption="Invoices with coupon / paid billing"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none"
          >
            <option value="" className="bg-slate-900">All statuses</option>
            <option value="Active" className="bg-slate-900">Active</option>
            <option value="Expired" className="bg-slate-900">Expired</option>
            <option value="Disabled" className="bg-slate-900">Disabled</option>
          </select>
        </div>

        {/* Coupon Table */}
        <DashboardTablePanel title="Coupons" description="All promotional coupons.">
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading…</p>
          ) : coupons.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No coupons found. Create one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Discount</th>
                    <th className="px-5 py-3 font-medium">Valid</th>
                    <th className="px-5 py-3 font-medium">Usage</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-3 font-mono font-semibold text-blue-300">{c.couponCode}</td>
                      <td className="max-w-[160px] truncate px-5 py-3 text-slate-200">{c.couponName}</td>
                      <td className="px-5 py-3 text-white">
                        {c.discountType === 'Percentage' ? `${c.discountValue}%` : formatInr(c.discountValue)}
                        {c.maximumDiscountAmount ? ` (max ${formatInr(c.maximumDiscountAmount)})` : ''}
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {formatDate(c.validFrom)} – {formatDate(c.validTo)}
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {c.usedCount} / {c.usageLimit}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[c.status]}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openEdit(c)} className="text-sm text-blue-300 hover:text-blue-200 hover:underline">
                            Edit
                          </button>
                          <button type="button" onClick={() => setUsageModal(c.id)} className="text-sm text-slate-300 hover:text-slate-100 hover:underline">
                            Usages
                          </button>
                          {c.status === 'Active' && (
                            <button type="button" onClick={() => handleDisable(c)} className="text-sm text-rose-300 hover:text-rose-200 hover:underline">
                              Disable
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Coupon' : 'Create Coupon'} size="wide" scrollable>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
              {formError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Coupon Code"
              value={form.couponCode}
              onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))}
              placeholder="e.g. NEWYEAR20"
              disabled={!!editing}
              required
            />
            <Input
              label="Coupon Name"
              value={form.couponName}
              onChange={(e) => setForm((f) => ({ ...f, couponName: e.target.value }))}
              placeholder="New Year Offer"
              required
            />
          </div>
          <Input
            label="Description"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Discount Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as DiscountType }))}
                className={selectClass}
              >
                <option value="Percentage" className="bg-slate-900">Percentage (%)</option>
                <option value="Fixed" className="bg-slate-900">Fixed Amount (₹)</option>
              </select>
            </div>
            <Input
              label={form.discountType === 'Percentage' ? 'Discount (%)' : 'Discount Amount (₹)'}
              type="number"
              min={0}
              step={0.01}
              value={form.discountValue || ''}
              onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) || 0 }))}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Minimum Invoice Amount (₹)"
              type="number"
              min={0}
              step={1}
              value={form.minimumInvoiceAmount || ''}
              onChange={(e) => setForm((f) => ({ ...f, minimumInvoiceAmount: Number(e.target.value) || 0 }))}
            />
            <Input
              label="Maximum Discount Cap (₹)"
              type="number"
              min={0}
              step={1}
              value={form.maximumDiscountAmount ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, maximumDiscountAmount: e.target.value ? Number(e.target.value) : null }))}
              placeholder="No cap"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Valid From"
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
              required
            />
            <Input
              label="Valid To"
              type="date"
              value={form.validTo}
              onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Usage Limit (total)"
              type="number"
              min={1}
              value={form.usageLimit || ''}
              onChange={(e) => setForm((f) => ({ ...f, usageLimit: Number(e.target.value) || 1 }))}
              required
            />
            <Input
              label="Per User Limit"
              type="number"
              min={1}
              value={form.perUserLimit || ''}
              onChange={(e) => setForm((f) => ({ ...f, perUserLimit: Number(e.target.value) || 1 }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Update' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Usage Modal */}
      <Modal open={usageModal != null} onClose={() => setUsageModal(null)} title="Coupon Usage History" size="wide" scrollable>
        {usagesLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : usages.length === 0 ? (
          <p className="text-sm text-slate-400">No usage records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Discount</th>
                  <th className="px-4 py-2 font-medium">Used At</th>
                  <th className="px-4 py-2 font-medium">Payment ID</th>
                </tr>
              </thead>
              <tbody>
                {usages.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="px-4 py-2 text-slate-200">{u.userName ?? `User #${u.userId}`}</td>
                    <td className="px-4 py-2 font-medium text-white">{formatInr(u.discountAmount)}</td>
                    <td className="px-4 py-2 text-slate-300">{new Date(u.usedAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-slate-400">#{u.membershipPaymentId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setUsageModal(null)}>
            Close
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
