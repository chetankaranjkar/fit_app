import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { retailProductsService, retailCategoriesService } from '../../../services/retail.service'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import type { Product, CreateProductDto, ProductStatus } from '../../../types/retail'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'
const selectClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none'

interface Props {
  product?: Product
  onClose: () => void
}

export function ProductForm({ product, onClose }: Props) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CreateProductDto & { status?: ProductStatus }>({
    name: product?.name ?? '',
    description: product?.description ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    categoryId: product?.categoryId ?? 0,
    brand: product?.brand ?? '',
    flavor: product?.flavor ?? '',
    size: product?.size ?? '',
    unit: product?.unit ?? '',
    batchNumber: product?.batchNumber ?? '',
    manufacturingDate: product?.manufacturingDate ?? null,
    expiryDate: product?.expiryDate ?? null,
    gstPercent: product?.gstPercent ?? 18,
    mrp: product?.mrp ?? 0,
    purchasePrice: product?.purchasePrice ?? 0,
    sellingPrice: product?.sellingPrice ?? 0,
    initialStockQuantity: 0,
    lowStockThreshold: product?.lowStockThreshold ?? 5,
    imageUrl: product?.imageUrl ?? '',
    status: product?.status,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['retail-categories-flat'],
    queryFn: async () => (await retailCategoriesService.getFlat()).data,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form }
      if (!payload.manufacturingDate) delete payload.manufacturingDate
      if (!payload.expiryDate) delete payload.expiryDate
      if (product) {
        const { data } = await retailProductsService.update(product.id, payload)
        return data
      }
      const { data } = await retailProductsService.create(payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products'] })
      queryClient.invalidateQueries({ queryKey: ['retail-categories-tree'] })
      toast.success(product ? 'Product updated' : 'Product created')
      onClose()
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Failed to save product')),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('Name required')
    if (!form.sku.trim()) return setError('SKU required')
    if (!form.categoryId) return setError('Category required')
    if (form.sellingPrice <= 0) return setError('Selling price must be > 0')
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}

      {/* Basic Info */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Basic Info</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Product Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="SKU *" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} disabled={!!product} required />
          <Input label="Barcode" value={form.barcode ?? ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <div>
            <label className={labelClass}>Category *</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })} className={selectClass} required>
              <option value={0} className="bg-slate-900">Select category</option>
              {categories.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.parentCategoryName ? `${c.parentCategoryName} → ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Input label="Description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </section>

      {/* Attributes */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Attributes</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Brand" value={form.brand ?? ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. MuscleBlaze" />
          <Input label="Flavor" value={form.flavor ?? ''} onChange={(e) => setForm({ ...form, flavor: e.target.value })} placeholder="e.g. Chocolate" />
          <Input label="Size" value={form.size ?? ''} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 1kg, M, L" />
          <Input label="Unit" value={form.unit ?? ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. piece, bottle" />
          <Input label="Batch Number" value={form.batchNumber ?? ''} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
          <Input label="Image URL" value={form.imageUrl ?? ''} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Optional" />
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Pricing & GST</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="MRP (₹)" type="number" min={0} step={0.01} value={form.mrp} onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) || 0 })} required />
          <Input label="Purchase Price (₹)" type="number" min={0} step={0.01} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) || 0 })} required />
          <Input label="Selling Price (₹)" type="number" min={0} step={0.01} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) || 0 })} required />
          <Input label="GST %" type="number" min={0} step={0.01} value={form.gstPercent} onChange={(e) => setForm({ ...form, gstPercent: Number(e.target.value) || 0 })} required />
        </div>
      </section>

      {/* Stock & Dates */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Stock & Expiry</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {!product && (
            <Input label="Initial Stock" type="number" min={0} value={form.initialStockQuantity} onChange={(e) => setForm({ ...form, initialStockQuantity: Number(e.target.value) || 0 })} />
          )}
          <Input label="Low Stock Threshold" type="number" min={0} value={form.lowStockThreshold ?? 5} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) || 5 })} />
          <Input label="Manufacturing Date" type="date" value={form.manufacturingDate ?? ''} onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value || null })} />
          <Input label="Expiry Date" type="date" value={form.expiryDate ?? ''} onChange={(e) => setForm({ ...form, expiryDate: e.target.value || null })} />
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{product ? 'Update' : 'Create Product'}</Button>
      </div>
    </form>
  )
}
