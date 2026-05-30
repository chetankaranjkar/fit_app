import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { authService } from '../../../services/auth.service'
import { retailProductsService } from '../../../services/retail.service'
import { SupplementAnalyticsPanel } from '../components/SupplementAnalyticsPanel'
import { supplementTrackingService } from '../services/supplementTracking.service'
import {
  SUPPLEMENT_CATEGORIES,
  type SupplementMaster,
  type UpsertSupplementMasterPayload,
} from '../types/supplementTracking'

const emptyForm = (): UpsertSupplementMasterPayload => ({
  name: '',
  category: 'Protein',
  description: '',
  defaultDosage: '',
  isActive: true,
  productId: null,
})

export function SupplementMasterPage() {
  const user = authService.getCurrentUser()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SupplementMaster | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [showInactive, setShowInactive] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['supplement-master', showInactive],
    queryFn: async () => (await supplementTrackingService.listMaster(!showInactive)).data,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-link'],
    queryFn: async () => (await retailProductsService.search({ status: 'Active' })).data,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) return supplementTrackingService.updateMaster(editing.id, form)
      return supplementTrackingService.createMaster(form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplement-master'] })
      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm())
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplementTrackingService.deleteMaster(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplement-master'] }),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (row: SupplementMaster) => {
    setEditing(row)
    setForm({
      name: row.name,
      category: row.category,
      description: row.description ?? '',
      defaultDosage: row.defaultDosage ?? '',
      isActive: row.isActive,
      productId: row.productId ?? null,
    })
    setModalOpen(true)
  }

  return (
    <DashboardLayout userName={user?.fullName?.trim() || user?.username?.trim() || 'Admin'}>
      <DashboardSubpageShell
        eyebrow="Nutrition"
        titleGradient="supplement catalog"
        subtitle="Manage supplement master data and link retail products for member assignments."
        showExport={false}
        primaryAction={{ label: '+ Add supplement', onClick: openCreate }}
      >
        <SupplementAnalyticsPanel />

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-display text-xl text-white">Supplement master</h2>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-white/20"
            />
            Show inactive
          </label>
        </div>

        {isLoading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card h-36 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((row) => (
              <article
                key={row.id}
                className="glass-card-strong rounded-2xl border border-white/10 p-5 transition hover:border-[rgba(245,196,0,0.3)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#F5C400]/75">{row.category}</p>
                    <h3 className="font-display text-lg text-white">{row.name}</h3>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      row.isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {row.defaultDosage && (
                  <p className="mt-2 text-sm text-slate-400">Default: {row.defaultDosage}</p>
                )}
                {row.productName && (
                  <p className="mt-1 text-xs text-slate-500">Product: {row.productName}</p>
                )}
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => openEdit(row)} className="text-xs font-semibold text-[#F5C400]">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(row.id)}
                    className="text-xs text-rose-400"
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Edit supplement' : 'New supplement'}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              saveMutation.mutate()
            }}
          >
            <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <label className="block text-sm text-slate-300">
              Category
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {SUPPLEMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Default dosage"
              value={form.defaultDosage ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, defaultDosage: e.target.value }))}
            />
            <label className="block text-sm text-slate-300">
              Description
              <textarea
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                rows={2}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Link product
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                value={form.productId ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, productId: e.target.value ? Number(e.target.value) : null }))
                }
              >
                <option value="">None</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active in catalog
            </label>
            {saveMutation.isError && (
              <p className="text-sm text-rose-400">{getApiErrorMessage(saveMutation.error)}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        </Modal>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
