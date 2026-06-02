import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { DataPageSection } from '../../../components/layout/DataPageShell'
import {
  DataToolbar,
  EnterpriseDataGrid,
  RowActionsMenu,
  StatusBadge,
  type DataGridColumnDef,
} from '../../../components/data-grid'
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
  } catch {
    return { userName: 'User' }
  }
}

function productStatusVariant(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'Active') return 'success'
  if (status === 'OutOfStock') return 'warning'
  return 'neutral'
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
    queryFn: async () =>
      (
        await retailProductsService.search({
          search: search || undefined,
          categoryId: categoryId ? Number(categoryId) : undefined,
          lowStockOnly: showLowStock || undefined,
        })
      ).data,
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

  const columns = useMemo<DataGridColumnDef<Product>[]>(
    () => [
      {
        id: 'sku',
        header: 'SKU',
        sticky: true,
        minWidth: 100,
        width: 110,
        sortable: true,
        accessorFn: (p) => p.sku,
        cell: ({ value }) => <span className="font-mono text-xs text-blue-300">{String(value)}</span>,
      },
      {
        id: 'product',
        header: 'Product',
        minWidth: 200,
        width: 240,
        sortable: true,
        accessorFn: (p) => p.name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-white">{row.name}</div>
            {(row.brand || row.flavor || row.size) && (
              <div className="truncate text-[10px] text-slate-500">
                {[row.brand, row.flavor, row.size].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        minWidth: 120,
        width: 140,
        hideBelow: 'lg',
        accessorFn: (p) => p.categoryName ?? '',
      },
      {
        id: 'stock',
        header: 'Stock',
        minWidth: 80,
        width: 90,
        sortable: true,
        align: 'right',
        accessorFn: (p) => p.stockQuantity,
        cell: ({ row }) => (
          <span className={row.isLowStock ? 'font-semibold text-amber-300' : 'tabular-nums text-slate-200'}>
            {row.stockQuantity}
          </span>
        ),
      },
      {
        id: 'mrp',
        header: 'MRP',
        minWidth: 90,
        width: 100,
        hideBelow: 'md',
        align: 'right',
        accessorFn: (p) => p.mrp,
        cell: ({ row }) => formatInr(row.mrp),
      },
      {
        id: 'selling',
        header: 'Selling',
        minWidth: 100,
        width: 110,
        align: 'right',
        accessorFn: (p) => p.sellingPrice,
        cell: ({ row }) => <span className="font-medium text-white">{formatInr(row.sellingPrice)}</span>,
      },
      {
        id: 'expiry',
        header: 'Expiry',
        minWidth: 110,
        width: 120,
        hideBelow: 'xl',
        accessorFn: (p) => p.expiryDate ?? '',
        cell: ({ row }) =>
          row.expiryDate ? (
            <span
              className={
                row.isExpired ? 'text-rose-300' : row.isExpiringSoon ? 'text-amber-300' : 'text-slate-300'
              }
            >
              {new Date(row.expiryDate).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-slate-500">—</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        minWidth: 100,
        width: 110,
        accessorFn: (p) => p.status,
        cell: ({ row }) => (
          <StatusBadge variant={productStatusVariant(row.status)}>{row.status}</StatusBadge>
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
              { id: 'stock', label: 'Add stock', onClick: setStockProduct },
              { id: 'edit', label: 'Edit', onClick: setEditing },
              {
                id: 'delete',
                label: 'Delete',
                variant: 'danger',
                onClick: (p) => {
                  if (window.confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id)
                },
              },
            ]}
          />
        ),
      },
    ],
    [deleteMutation],
  )

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Retail"
        titleGradient="Products"
        subtitle="Manage all retail products: supplements, accessories, apparel, and more."
        primaryAction={{ label: '+ Add Product', onClick: () => setCreating(true) }}
        showExport={false}
      >
        <DataPageSection>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard label="Total Products" value={String(products.length)} color="blue" />
            <SummaryCard label="Stock Value" value={formatInr(totalValue)} color="emerald" />
            <SummaryCard
              label="Low Stock / Expiring"
              value={`${lowStockCount} / ${expiringCount}`}
              color="amber"
            />
          </div>
        </DataPageSection>

        <DashboardTablePanel
          title="Product Catalog"
          description="Sort, filter, and resize columns. Horizontal scroll on smaller screens."
          toolbar={
            <DataToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name, SKU, brand…"
              searchAriaLabel="Search products"
              filters={
                <>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    aria-label="Category filter"
                  >
                    <option value="" className="bg-slate-900">
                      All categories
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.parentCategoryName ? `${c.parentCategoryName} → ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={showLowStock}
                      onChange={(e) => setShowLowStock(e.target.checked)}
                    />
                    Low stock only
                  </label>
                </>
              }
            />
          }
        >
          <EnterpriseDataGrid
            data={products}
            columns={columns}
            getRowId={(p) => p.id}
            loading={isLoading}
            emptyMessage="No products found."
          />
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

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const ring =
    color === 'blue'
      ? 'from-blue-500/20 to-indigo-500/10'
      : color === 'emerald'
        ? 'from-emerald-500/20 to-teal-500/10'
        : 'from-amber-500/20 to-orange-500/10'
  return (
    <div className={`glass-card rounded-2xl border border-white/10 bg-gradient-to-br ${ring} px-4 py-3`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}
