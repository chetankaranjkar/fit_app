import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { retailProductsService, retailCategoriesService } from '../../../services/retail.service'
import { formatInr } from '../../../lib/formatInr'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import type { Product } from '../../../types/retail'
import { ProductForm } from '../components/ProductForm'
import { StockInwardModal } from '../components/StockInwardModal'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const u = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: u?.fullName?.trim() || u?.username?.trim() || 'User' }
  } catch { return { userName: 'User' } }
}

export function ProductsPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['retail-products', search, categoryId, showLowStock],
    queryFn: async () => (await retailProductsService.search({
      search: search || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      lowStockOnly: showLowStock || undefined,
    })).data,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['retail-categories-flat'],
    queryFn: async () => (await retailCategoriesService.getFlat()).data,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => retailProductsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products'] })
      toast.success('Product deleted')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to delete')),
  })

  const totalValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0)
  const lowStockCount = products.filter((p) => p.isLowStock).length
  const expiringCount = products.filter((p) => p.isExpiringSoon || p.isExpired).length

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Retail"
        titleGradient="Products"
        subtitle="Manage all retail products: supplements, accessories, apparel, and more."
        primaryAction={{ label: '+ Add Product', onClick: () => setCreating(true) }}
        showExport={false}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Products" value={products.length} color="blue" />
          <SummaryCard label="Stock Value" value={formatInr(totalValue)} color="emerald" />
          <SummaryCard label="Low Stock / Expiring" value={`${lowStockCount} / ${expiringCount}`} color="amber" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input type="text" placeholder="Search name, SKU, brand…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100" />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100">
            <option value="" className="bg-slate-900">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">
                {c.parentCategoryName ? `${c.parentCategoryName} → ${c.name}` : c.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
            <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} />
            Low stock only
          </label>
        </div>

        <DashboardTablePanel title="Product Catalog">
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading…</p>
          ) : products.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No products found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">MRP</th>
                    <th className="px-4 py-3">Selling</th>
                    <th className="px-4 py-3">GST</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-300">{p.sku}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-slate-100">{p.name}</div>
                        {(p.brand || p.flavor || p.size) && (
                          <div className="text-[11px] text-slate-500">
                            {[p.brand, p.flavor, p.size].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{p.categoryName ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={p.isLowStock ? 'font-bold text-amber-300' : 'text-slate-200'}>
                          {p.stockQuantity}
                        </span>
                        {p.isLowStock && <span className="ml-1 text-[10px] text-amber-300">⚠</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{formatInr(p.mrp)}</td>
                      <td className="px-4 py-2.5 font-medium text-white">{formatInr(p.sellingPrice)}</td>
                      <td className="px-4 py-2.5 text-slate-400">{p.gstPercent}%</td>
                      <td className="px-4 py-2.5">
                        {p.expiryDate ? (
                          <span className={p.isExpired ? 'text-rose-300' : p.isExpiringSoon ? 'text-amber-300' : 'text-slate-300'}>
                            {new Date(p.expiryDate).toLocaleDateString()}
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          p.status === 'Active' ? 'bg-emerald-500/15 text-emerald-300' :
                          p.status === 'OutOfStock' ? 'bg-amber-500/15 text-amber-300' :
                          'bg-slate-500/15 text-slate-300'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setStockProduct(p)} className="text-xs text-emerald-300 hover:underline">+Stock</button>
                          <button type="button" onClick={() => setEditing(p)} className="text-xs text-blue-300 hover:underline">Edit</button>
                          <button type="button" onClick={() => { if (window.confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id) }} className="text-xs text-rose-300 hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal open={creating} onClose={() => setCreating(false)} title="New Product" size="wide" scrollable>
        <ProductForm onClose={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit: ${editing?.name ?? ''}`} size="wide" scrollable>
        {editing && <ProductForm product={editing} onClose={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!stockProduct} onClose={() => setStockProduct(null)} title="Add Stock (Inward)">
        {stockProduct && <StockInwardModal product={stockProduct} onClose={() => setStockProduct(null)} />}
      </Modal>
    </DashboardLayout>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
    emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
  }
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${colorMap[color] ?? colorMap.blue} p-4`}>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
