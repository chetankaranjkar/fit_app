import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { ListPagination } from '../../components/ui/ListPagination'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { stretchesService } from '../../services/stretches.service'
import type { CreateStretchDto, Stretch, UpdateStretchDto } from '../../types/stretch'

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

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20'

type FormState = {
  name: string
  description: string
  videoUrl: string
  durationSeconds: number
  difficultyLevel: string
  bodyPart: string
  isActive: boolean
}

const defaultForm: FormState = {
  name: '',
  description: '',
  videoUrl: '',
  durationSeconds: 45,
  difficultyLevel: 'Beginner',
  bodyPart: '',
  isActive: true,
}

function toForm(s: Stretch): FormState {
  return {
    name: s.name,
    description: s.description ?? '',
    videoUrl: s.videoUrl ?? '',
    durationSeconds: s.durationSeconds,
    difficultyLevel: s.difficultyLevel ?? 'Beginner',
    bodyPart: s.bodyPart ?? '',
    isActive: s.isActive,
  }
}

export function StretchesPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewItem, setViewItem] = useState<Stretch | null>(null)
  const [editing, setEditing] = useState<Stretch | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: paged, isLoading } = useQuery({
    queryKey: ['stretches-paged', page, pageSize, search, difficulty],
    queryFn: async () => {
      const { data } = await stretchesService.getPaged({
        page,
        pageSize,
        search: search || undefined,
        difficulty,
      })
      return data
    },
  })

  const items = paged?.items ?? []

  const createMutation = useMutation({
    mutationFn: (payload: CreateStretchDto) => stretchesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stretches-paged'] })
      closeModal()
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateStretchDto }) =>
      stretchesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stretches-paged'] })
      closeModal()
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stretchesService.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['stretches-paged'] }),
  })

  useEffect(() => setPage(1), [search, difficulty, pageSize])

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: Stretch) {
    setEditing(item)
    setForm(toForm(item))
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(defaultForm)
    setFormError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    const payload: CreateStretchDto = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      videoUrl: form.videoUrl.trim() || null,
      durationSeconds: form.durationSeconds,
      difficultyLevel: form.difficultyLevel,
      bodyPart: form.bodyPart.trim() || null,
      isActive: form.isActive,
    }
    if (editing) updateMutation.mutate({ id: editing.id, payload })
    else createMutation.mutate(payload)
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Masters · Training"
        titleGradient="Stretches"
        subtitle="Manage recovery stretches for workout plans."
        primaryAction={{ label: '+ Create stretch', onClick: openCreate }}
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            placeholder="Search stretches…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <select className={selectClass + ' max-w-[160px]'} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option className="bg-slate-900 text-slate-100" value="All">All difficulties</option>
            <option className="bg-slate-900 text-slate-100" value="Beginner">Beginner</option>
            <option className="bg-slate-900 text-slate-100" value="Intermediate">Intermediate</option>
            <option className="bg-slate-900 text-slate-100" value="Advanced">Advanced</option>
          </select>
        </div>

        <DashboardTablePanel title="Stretch library" description={isLoading ? 'Loading…' : items.length === 0 ? 'No stretches found.' : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Body part</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                    <td className="px-4 py-3 text-slate-300">{item.bodyPart ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{item.durationSeconds}s</td>
                    <td className="px-4 py-3 text-slate-300">{item.difficultyLevel ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          item.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setViewItem(item)}>
                          View
                        </Button>
                        <Button variant="soft" size="sm" onClick={() => openEdit(item)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-300"
                          onClick={() => {
                            if (window.confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item.id)
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={page}
            pageSize={pageSize}
            totalCount={paged?.totalCount ?? 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit stretch' : 'Create stretch'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-sm text-rose-400">{formError}</p>}
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <Input label="Video URL" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Duration (seconds)"
              type="number"
              min={5}
              value={form.durationSeconds}
              onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })}
            />
            <Input label="Body part" value={form.bodyPart} onChange={(e) => setForm({ ...form, bodyPart: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Difficulty</label>
            <select className={selectClass} value={form.difficultyLevel} onChange={(e) => setForm({ ...form, difficultyLevel: e.target.value })}>
              <option className="bg-slate-900 text-slate-100" value="Beginner">Beginner</option>
              <option className="bg-slate-900 text-slate-100" value="Intermediate">Intermediate</option>
              <option className="bg-slate-900 text-slate-100" value="Advanced">Advanced</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={viewItem?.name ?? 'Stretch'}>
        {viewItem && (
          <div className="space-y-3 text-sm text-slate-300">
            <p>{viewItem.description || 'No description.'}</p>
            <p>
              <span className="text-slate-500">Body part:</span> {viewItem.bodyPart ?? '—'}
            </p>
            <p>
              <span className="text-slate-500">Duration:</span> {viewItem.durationSeconds}s
            </p>
            <p>
              <span className="text-slate-500">Difficulty:</span> {viewItem.difficultyLevel ?? '—'}
            </p>
            {viewItem.videoUrl && (
              <a href={viewItem.videoUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                Open video
              </a>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
