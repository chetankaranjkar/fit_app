import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { ModulePageShell } from '../components/ModulePageShell'
import { EmptyState } from '../components/EmptyState'
import { FilterBar } from '../components/FilterBar'
import { useVendors } from '../hooks/useGymOperations'
import { useStaggerAnimation } from '../hooks/useStaggerAnimation'
import type { Vendor, VendorCategory } from '../types'

const VENDOR_CATEGORY_COLORS: Record<VendorCategory, string> = {
  Equipment: 'bg-blue-500/10 text-blue-300 border-blue-400/20',
  Cleaning: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
  Maintenance: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
  Supplies: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20',
  IT: 'bg-purple-500/10 text-purple-300 border-purple-400/20',
  Other: 'bg-slate-500/10 text-slate-300 border-slate-400/20',
}

type FilterCategory = 'ALL' | VendorCategory

export function VendorsPage() {
  const { data = [], isLoading } = useVendors()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FilterCategory>('ALL')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const tableRef = useRef<HTMLTableSectionElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((v) => {
      if (category !== 'ALL' && v.category !== category) return false
      if (!q) return true
      return (
        v.name.toLowerCase().includes(q) ||
        (v.contactPerson ?? '').toLowerCase().includes(q) ||
        (v.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [data, category, query])

  useStaggerAnimation(tableRef, 'tr[data-row]', [filtered.length, isLoading])

  const categoryOptions: { value: FilterCategory; label: string }[] = [
    { value: 'ALL', label: 'All categories' },
    ...(Object.keys(VENDOR_CATEGORY_COLORS) as VendorCategory[]).map((c) => ({
      value: c as FilterCategory,
      label: c,
    })),
  ]

  return (
    <ModulePageShell
      eyebrow="Gym Operations"
      titleGradient="Vendors"
      subtitle="Your directory of partners, suppliers, and service providers."
      primaryAction={{ label: '+ Add vendor', onClick: () => setAddOpen(true) }}
    >
      <div className="mt-6">
        <section className="glass-card dashboard-card min-w-0 rounded-2xl">
          <div className="border-b border-white/5 px-6 py-5">
            <h2 className="text-base font-semibold text-white">Directory</h2>
            <p className="text-xs text-slate-400">
              {filtered.length} of {data.length} vendors
            </p>
          </div>
          <FilterBar
            search={query}
            onSearchChange={setQuery}
            selects={[
              {
                label: 'Category',
                value: category,
                onChange: (v) => setCategory(v as FilterCategory),
                options: categoryOptions,
              },
            ]}
          />

          {filtered.length === 0 && !isLoading ? (
            <EmptyState title="No vendors match your filters" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 font-semibold">Vendor</th>
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold">Contact</th>
                    <th className="px-6 py-3 font-semibold">Rating</th>
                    <th className="px-6 py-3 font-semibold">Contract</th>
                    <th className="px-6 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody ref={tableRef} className="divide-y divide-white/5">
                  {filtered.map((v) => (
                    <VendorRow
                      key={v.id}
                      vendor={v}
                      onEdit={() => setEditing(v)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <VendorFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="add"
      />
      <VendorFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        mode="edit"
        vendor={editing ?? undefined}
      />
    </ModulePageShell>
  )
}

function VendorRow({
  vendor,
  onEdit,
}: {
  vendor: Vendor
  onEdit: () => void
}) {
  const categoryCls = VENDOR_CATEGORY_COLORS[vendor.category]
  return (
    <tr data-row className="transition hover:bg-white/[0.03]">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">{vendor.name}</span>
          {vendor.notes && (
            <span className="mt-0.5 max-w-xs truncate text-[11px] text-slate-500">
              {vendor.notes}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${categoryCls}`}
        >
          {vendor.category}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col text-sm">
          {vendor.contactPerson && (
            <span className="text-slate-200">{vendor.contactPerson}</span>
          )}
          {vendor.email && (
            <span className="text-[11px] text-slate-500">{vendor.email}</span>
          )}
          {vendor.phone && (
            <span className="text-[11px] text-slate-500">{vendor.phone}</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <RatingStars value={vendor.rating} />
      </td>
      <td className="px-6 py-4">
        {vendor.onContract ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
            On contract
          </span>
        ) : (
          <span className="text-[11px] text-slate-500">Ad hoc</span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200 hover:shadow-[0_0_16px_-4px_rgba(96,165,250,0.5)]"
        >
          Edit
        </button>
      </td>
    </tr>
  )
}

function RatingStars({ value }: { value?: number }) {
  const safe = value ?? 0
  const rounded = Math.round(safe)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < rounded ? 'text-amber-300' : 'text-slate-600'}
        >
          ★
        </span>
      ))}
      <span className="ml-2 text-[11px] text-slate-400">
        {value != null ? safe.toFixed(1) : 'N/A'}
      </span>
    </div>
  )
}

function VendorFormModal({
  open,
  onClose,
  mode,
  vendor,
}: {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  vendor?: Vendor
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<VendorCategory>('Equipment')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (vendor) {
      setName(vendor.name)
      setCategory(vendor.category)
      setContactPerson(vendor.contactPerson ?? '')
      setEmail(vendor.email ?? '')
      setPhone(vendor.phone ?? '')
    } else {
      setName('')
      setCategory('Equipment')
      setContactPerson('')
      setEmail('')
      setPhone('')
    }
  }, [vendor])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === 'add' ? 'Add vendor' : 'Edit vendor'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <TextInput label="Vendor name" value={name} onChange={setName} required />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as VendorCategory)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          >
            {Object.keys(VENDOR_CATEGORY_COLORS).map((c) => (
              <option key={c} value={c} className="bg-slate-900">
                {c}
              </option>
            ))}
          </select>
        </div>
        <TextInput label="Contact person" value={contactPerson} onChange={setContactPerson} />
        <TextInput label="Email" value={email} onChange={setEmail} type="email" />
        <TextInput label="Phone" value={phone} onChange={setPhone} />
        <p className="rounded-lg border border-blue-400/20 bg-blue-500/5 p-2 text-[11px] text-blue-200">
          Mock mode — changes are not persisted yet.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            {mode === 'add' ? 'Add vendor' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function TextInput({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />
    </div>
  )
}
