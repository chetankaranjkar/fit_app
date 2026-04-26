import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ExerciseCard } from './components/ExerciseCard'
import { ExerciseDetailDrawer } from './components/ExerciseDetailDrawer'
import { ExerciseForm } from './components/ExerciseForm'
import { FilterBar } from './components/FilterBar'
import { useExerciseMutations, useExercisesQuery } from './hooks'
import type { Exercise, ExerciseFilters } from './types'

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

const defaultFilters: ExerciseFilters = {
  search: '',
  category: '',
  difficulty: '',
  equipment: '',
}

export function ExerciseManagementPage() {
  const { userName } = getDashboardUser()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [filters, setFilters] = useState<ExerciseFilters>(defaultFilters)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Exercise | null>(null)

  const { data, isLoading } = useExercisesQuery({ page, pageSize, filters })
  const mutations = useExerciseMutations()
  const items = data?.items ?? []
  const pagination = data?.pagination

  const kpis = useMemo(() => {
    const total = pagination?.totalCount ?? 0
    const advanced = items.filter((item) => item.difficulty === 'Advanced').length
    const withVideo = items.filter((item) => Boolean(item.videoUrl)).length
    return { total, advanced, withVideo }
  }, [items, pagination?.totalCount])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(exercise: Exercise) {
    setEditing(exercise)
    setFormOpen(true)
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Training"
        titleBefore="Exercise "
        titleGradient="management"
        subtitle="Premium CRUD module with animations, filters, and scalable data-loading."
        showExport={false}
        primaryAction={{ label: '+ Add Exercise', onClick: openCreate }}
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass-card dashboard-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Total Exercises</p>
            <p className="mt-2 text-2xl font-bold text-white">{kpis.total}</p>
          </div>
          <div className="glass-card dashboard-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Advanced in current page</p>
            <p className="mt-2 text-2xl font-bold text-white">{kpis.advanced}</p>
          </div>
          <div className="glass-card dashboard-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Videos available</p>
            <p className="mt-2 text-2xl font-bold text-white">{kpis.withVideo}</p>
          </div>
        </div>

        <div className="glass-card dashboard-card rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <FilterBar value={filters} onChange={setFilters} />
            <div className="flex gap-2">
              <Button variant={view === 'grid' ? 'primary' : 'soft'} size="sm" onClick={() => setView('grid')}>
                Grid
              </Button>
              <Button variant={view === 'table' ? 'primary' : 'soft'} size="sm" onClick={() => setView('table')}>
                Table
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-56 animate-pulse rounded-2xl bg-white/10" />
                ))}
              </motion.div>
            ) : items.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-10 text-center"
              >
                <p className="text-lg font-semibold text-white">No exercises found</p>
                <p className="mt-2 text-sm text-slate-400">
                  Try broadening filters or add your first exercise with premium metadata.
                </p>
              </motion.div>
            ) : view === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                {items.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} onClick={() => setSelected(exercise)} />
                ))}
              </motion.div>
            ) : (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Muscle</th>
                      <th className="px-4 py-3">Difficulty</th>
                      <th className="px-4 py-3">Equipment</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((exercise) => (
                      <tr key={exercise.id} className="border-b border-white/5">
                        <td className="px-4 py-3 text-white">{exercise.name}</td>
                        <td className="px-4 py-3 text-slate-300">{exercise.category || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{exercise.muscleGroupPrimary || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{exercise.difficulty || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{exercise.equipment || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="soft" size="sm" onClick={() => setSelected(exercise)}>View</Button>
                            <Button variant="soft" size="sm" onClick={() => openEdit(exercise)}>Edit</Button>
                            <Button variant="soft" size="sm" className="text-rose-300" onClick={() => setConfirmDelete(exercise)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200"
              >
                <option value={8}>8 / page</option>
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
              </select>
              <Button variant="soft" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="soft" size="sm" disabled={Boolean(pagination && page >= pagination.totalPages)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      </DashboardSubpageShell>

      <ExerciseDetailDrawer exercise={selected} open={selected !== null} onClose={() => setSelected(null)} />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit exercise' : 'Add exercise'} size="wide" scrollable>
        <ExerciseForm
          initial={editing}
          isSubmitting={mutations.create.isPending || mutations.update.isPending}
          onSubmit={async (payload) => {
            try {
              if (editing) {
                await mutations.update.mutateAsync({ id: editing.id, payload })
                toast.success('Exercise updated.')
              } else {
                await mutations.create.mutateAsync(payload)
                toast.success('Exercise created.')
              }
              setFormOpen(false)
            } catch {
              toast.error('Failed to save exercise.')
            }
          }}
        />
      </Modal>

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Confirm delete">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Delete <span className="font-semibold text-white">{confirmDelete?.name}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              className="bg-rose-500/90"
              isLoading={mutations.remove.isPending}
              onClick={async () => {
                if (!confirmDelete) return
                try {
                  await mutations.remove.mutateAsync(confirmDelete.id)
                  toast.success('Exercise deleted.')
                  setConfirmDelete(null)
                } catch {
                  toast.error('Failed to delete exercise.')
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <button
        type="button"
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-[linear-gradient(135deg,#3b82f6,#a855f7)] px-5 py-3 text-sm font-semibold text-white shadow-2xl"
      >
        + Add Exercise
      </button>
    </DashboardLayout>
  )
}
