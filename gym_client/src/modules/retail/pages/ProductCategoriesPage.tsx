import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { retailCategoriesService } from '../../../services/retail.service'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import type { ProductCategory, CreateProductCategoryDto } from '../../../types/retail'

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

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'
const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none'

export function ProductCategoriesPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [form, setForm] = useState<CreateProductCategoryDto>({ name: '', sortOrder: 0, isActive: true })
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: tree = [],
    isError: treeError,
    error: treeQueryError,
    isLoading: treeLoading,
    refetch: refetchTree,
  } = useQuery({
    queryKey: ['retail-categories-tree'],
    queryFn: async () => (await retailCategoriesService.getTree()).data,
  })
  const { data: flat = [] } = useQuery({
    queryKey: ['retail-categories-flat'],
    queryFn: async () => (await retailCategoriesService.getFlat()).data,
  })

  const createMutation = useMutation({
    mutationFn: async () => (await retailCategoriesService.create(form)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-categories-tree'] })
      queryClient.invalidateQueries({ queryKey: ['retail-categories-flat'] })
      toast.success('Category created')
      closeModal()
    },
    onError: (err: unknown) => setFormError(getApiErrorMessage(err, 'Failed to create category')),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('No editing target')
      return (await retailCategoriesService.update(editing.id, form)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-categories-tree'] })
      queryClient.invalidateQueries({ queryKey: ['retail-categories-flat'] })
      toast.success('Category updated')
      closeModal()
    },
    onError: (err: unknown) => setFormError(getApiErrorMessage(err, 'Failed to update category')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => retailCategoriesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-categories-tree'] })
      queryClient.invalidateQueries({ queryKey: ['retail-categories-flat'] })
      toast.success('Category deleted')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to delete')),
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', sortOrder: 0, isActive: true })
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (c: ProductCategory) => {
    setEditing(c)
    setForm({
      name: c.name,
      description: c.description ?? '',
      parentCategoryId: c.parentCategoryId ?? null,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
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
    if (!form.name.trim()) return setFormError('Name is required.')
    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Retail"
        titleGradient="Product Categories"
        subtitle="Organize retail products into a hierarchy of categories and subcategories."
        primaryAction={{ label: '+ Add Category', onClick: openCreate }}
        showExport={false}
      >
        <DashboardTablePanel title="Category Tree" description="Hierarchical view of all categories.">
          {treeError ? (
            <div className="px-6 py-8 text-sm text-rose-200" role="alert">
              {getApiErrorMessage(treeQueryError, 'Could not load categories.')}
              <button
                type="button"
                className="ml-2 underline focus:outline-none"
                onClick={() => void refetchTree()}
              >
                Retry
              </button>
            </div>
          ) : treeLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading categories…</p>
          ) : tree.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">
              No categories yet. Restart the API after deploy to load demo data, or click + Add Category.
            </p>
          ) : (
            <div className="px-4 py-2">
              <CategoryTree nodes={tree} onEdit={openEdit} onDelete={(id) => { if (window.confirm('Delete this category?')) deleteMutation.mutate(id) }} />
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{formError}</p>}
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Supplements" required />
          <Input label="Description" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
          <div>
            <label className={labelClass}>Parent Category</label>
            <select value={form.parentCategoryId ?? ''} onChange={(e) => setForm((f) => ({ ...f, parentCategoryId: e.target.value ? Number(e.target.value) : null }))} className={selectClass}>
              <option value="" className="bg-slate-900">None (top level)</option>
              {flat.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.parentCategoryName ? `${c.parentCategoryName} → ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sort Order" type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} />
            <div>
              <label className={labelClass}>Active</label>
              <select value={String(form.isActive ?? true)} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))} className={selectClass}>
                <option value="true" className="bg-slate-900">Yes</option>
                <option value="false" className="bg-slate-900">No</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

function CategoryTree({ nodes, depth = 0, onEdit, onDelete }: { nodes: ProductCategory[]; depth?: number; onEdit: (c: ProductCategory) => void; onDelete: (id: number) => void }) {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/[0.04]" style={{ marginLeft: depth * 20 }}>
            <div className="flex items-center gap-2">
              <span className="text-slate-200">{depth > 0 && '↳ '}{n.name}</span>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">{n.productCount} products</span>
              {!n.isActive && <span className="text-[10px] text-rose-300">Inactive</span>}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onEdit(n)} className="text-xs text-blue-300 hover:underline">Edit</button>
              <button type="button" onClick={() => onDelete(n.id)} className="text-xs text-rose-300 hover:underline">Delete</button>
            </div>
          </div>
          {n.subCategories?.length > 0 && <CategoryTree nodes={n.subCategories} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />}
        </li>
      ))}
    </ul>
  )
}
