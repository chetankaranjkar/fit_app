import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { SectionCard } from '../components/SectionCard'
import { useTrainersModuleStore } from '../store'
import type { TrainerFormValues, TrainerRecord, TrainerSalaryType } from '../types'

const defaultForm: TrainerFormValues = {
  name: '',
  phone: '',
  specialization: '',
  salaryType: 'fixed',
  salaryAmount: 0,
  joiningDate: new Date().toISOString().slice(0, 10),
}

type SortKey = keyof Pick<
  TrainerRecord,
  'name' | 'phone' | 'specialization' | 'salaryType' | 'salaryAmount' | 'status'
>

export function TrainersManagementTab() {
  const trainers = useTrainersModuleStore((s) => s.trainers)
  const addTrainer = useTrainersModuleStore((s) => s.addTrainer)
  const updateTrainer = useTrainersModuleStore((s) => s.updateTrainer)
  const softDeleteTrainer = useTrainersModuleStore((s) => s.softDeleteTrainer)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TrainerFormValues>(defaultForm)
  const pageSize = 6

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return trainers
      .filter((trainer) => {
        if (!query) return true
        return [trainer.name, trainer.phone, trainer.specialization]
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
      .sort((a, b) => {
        const left = a[sortBy]
        const right = b[sortBy]
        if (typeof left === 'number' && typeof right === 'number') {
          return sortDir === 'asc' ? left - right : right - left
        }
        return sortDir === 'asc'
          ? String(left).localeCompare(String(right))
          : String(right).localeCompare(String(left))
      })
  }, [search, sortBy, sortDir, trainers])

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  function openEdit(trainer: TrainerRecord) {
    setEditingId(trainer.id)
    setForm({
      name: trainer.name,
      phone: trainer.phone,
      specialization: trainer.specialization,
      salaryType: trainer.salaryType,
      salaryAmount: trainer.salaryAmount,
      joiningDate: trainer.joiningDate,
    })
    setModalOpen(true)
  }

  function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.specialization.trim()) {
      toast.error('Name, phone, and specialization are required.')
      return
    }
    if (editingId) {
      updateTrainer(editingId, form)
      toast.success('Trainer updated.')
    } else {
      addTrainer(form)
      toast.success('Trainer added.')
    }
    setModalOpen(false)
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(key)
    setSortDir('asc')
  }

  return (
    <>
      <SectionCard
        title="Trainer Management"
        subtitle="CRUD with soft delete, sorting, filtering, and pagination."
        action={<Button size="sm" onClick={openCreate}>+ Add Trainer</Button>}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search by name, phone, specialization"
            className="min-w-[240px]"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                {[
                  ['name', 'Name'],
                  ['phone', 'Phone'],
                  ['specialization', 'Specialization'],
                  ['salaryType', 'Salary Type'],
                  ['salaryAmount', 'Salary'],
                  ['status', 'Status'],
                ].map(([key, label]) => (
                  <th key={key} className="px-4 py-3">
                    <button type="button" className="hover:text-white" onClick={() => toggleSort(key as SortKey)}>
                      {label}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((trainer) => (
                <tr key={trainer.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">{trainer.name}</td>
                  <td className="px-4 py-3 text-slate-300">{trainer.phone}</td>
                  <td className="px-4 py-3 text-slate-300">{trainer.specialization}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {trainer.salaryType === 'fixed' ? 'Fixed' : 'Per Session'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">₹{trainer.salaryAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      trainer.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-slate-300'
                    }`}>
                      {trainer.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="soft" size="sm" onClick={() => openEdit(trainer)}>Edit</Button>
                      <Button
                        variant="soft"
                        size="sm"
                        className="text-rose-300"
                        onClick={() => {
                          softDeleteTrainer(trainer.id)
                          toast.success('Trainer marked inactive.')
                        }}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="soft" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="soft" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </SectionCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Trainer' : 'Add Trainer'}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <Input
            label="Specialization"
            value={form.specialization}
            onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Salary Type
            </label>
            <select
              value={form.salaryType}
              onChange={(e) => setForm((prev) => ({ ...prev, salaryType: e.target.value as TrainerSalaryType }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="fixed">Fixed</option>
              <option value="per_session">Per Session</option>
            </select>
          </div>
          <Input
            type="number"
            label="Salary Amount"
            value={String(form.salaryAmount)}
            onChange={(e) => setForm((prev) => ({ ...prev, salaryAmount: Number(e.target.value) }))}
          />
          <Input
            type="date"
            label="Joining Date"
            value={form.joiningDate}
            onChange={(e) => setForm((prev) => ({ ...prev, joiningDate: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{editingId ? 'Save changes' : 'Create trainer'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
