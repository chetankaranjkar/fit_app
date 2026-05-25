import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { ptPackagesService } from '../../../services/personalTraining.service'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { formatInr } from '../../../lib/formatInr'
import type { PTPackage } from '../../../types/personalTraining'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return u?.fullName?.trim() || u?.username?.trim() || 'User'
  } catch {
    return 'User'
  }
}

export function PtPackagesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<PTPackage | null>(null)
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['pt-packages', search, page],
    queryFn: async () =>
      (await ptPackagesService.search({ search: search || undefined, page, pageSize: 20 })).data,
  })

  const items = data?.items ?? []

  const saveMutation = useMutation({
    mutationFn: async (form: Partial<PTPackage> & { packageName: string }) => {
      const body = {
        packageName: form.packageName,
        description: form.description,
        packageType: form.packageType ?? 'SessionBased',
        totalSessions: form.totalSessions ?? 10,
        validityDays: form.validityDays ?? 30,
        price: form.price ?? 0,
        taxPercentage: form.taxPercentage ?? 0,
        defaultDiscountAmount: form.defaultDiscountAmount ?? 0,
        isActive: form.isActive ?? true,
      }
      if (editing) return ptPackagesService.update(editing.id, body)
      return ptPackagesService.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-packages'] })
      setCreating(false)
      setEditing(null)
      toast.success('Package saved')
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Save failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ptPackagesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-packages'] })
      toast.success('Deleted')
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Delete failed')),
  })

  return (
    <DashboardLayout userName={getDashboardUser()}>
      <DashboardSubpageShell
        eyebrow="Personal Training"
        titleGradient="Packages"
        primaryAction={{ label: '+ New package', onClick: () => setCreating(true) }}
      >
        <input
          type="text"
          placeholder="Search packages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100"
        />
        <DashboardTablePanel title="PT packages">
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Sessions</th>
                    <th className="px-6 py-3">Validity</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-white/5">
                      <td className="px-6 py-3 text-white">{p.packageName}</td>
                      <td className="px-6 py-3">{p.packageType}</td>
                      <td className="px-6 py-3">{p.totalSessions}</td>
                      <td className="px-6 py-3">{p.validityDays}d</td>
                      <td className="px-6 py-3">{formatInr(p.price)}</td>
                      <td className="px-6 py-3">{p.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="px-6 py-3 space-x-2">
                        <Button variant="soft" size="sm" onClick={() => setEditing(p)}>Edit</Button>
                        <Button variant="soft" size="sm" onClick={() => deleteMutation.mutate(p.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between px-6 py-4 text-sm text-slate-400">
            <span>Total: {data?.totalCount ?? 0}</span>
            <div className="flex gap-2">
              <Button variant="soft" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="soft" size="sm" disabled={items.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <PackageFormModal
        open={creating || !!editing}
        initial={editing ?? undefined}
        onClose={() => { setCreating(false); setEditing(null) }}
        onSave={(form) => saveMutation.mutate(form)}
        loading={saveMutation.isPending}
      />
    </DashboardLayout>
  )
}

function PackageFormModal({
  open,
  initial,
  onClose,
  onSave,
  loading,
}: {
  open: boolean
  initial?: PTPackage
  onClose: () => void
  onSave: (f: Partial<PTPackage> & { packageName: string }) => void
  loading: boolean
}) {
  const [name, setName] = useState(initial?.packageName ?? '')
  const [sessions, setSessions] = useState(initial?.totalSessions ?? 10)
  const [validity, setValidity] = useState(initial?.validityDays ?? 30)
  const [price, setPrice] = useState(initial?.price ?? 0)
  const [tax, setTax] = useState(initial?.taxPercentage ?? 0)

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit package' : 'New package'} size="wide">
      <div className="space-y-4">
        <Input label="Package name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Sessions" type="number" value={String(sessions)} onChange={(e) => setSessions(Number(e.target.value))} />
          <Input label="Validity (days)" type="number" value={String(validity)} onChange={(e) => setValidity(Number(e.target.value))} />
          <Input label="Price" type="number" value={String(price)} onChange={(e) => setPrice(Number(e.target.value))} />
          <Input label="Tax %" type="number" value={String(tax)} onChange={(e) => setTax(Number(e.target.value))} />
        </div>
        <Button
          variant="primary"
          disabled={loading || !name.trim()}
          onClick={() => onSave({ packageName: name, totalSessions: sessions, validityDays: validity, price, taxPercentage: tax, packageType: initial?.packageType ?? 'SessionBased' })}
        >
          Save
        </Button>
      </div>
    </Modal>
  )
}
