import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { workoutCategoriesService } from '../../services/workoutCategories.service'
import type { CreateWorkoutCategoryDto, WorkoutCategorySummary } from '../../types/workoutCategory'

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

export function WorkoutCategoriesPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<CreateWorkoutCategoryDto>({ name: '', description: '', isActive: true })
  const [formError, setFormError] = useState<string | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['workout-categories'],
    queryFn: async () => {
      const { data } = await workoutCategoriesService.getAll()
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkoutCategoryDto) => workoutCategoriesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workout-categories'] })
      setModalOpen(false)
      setForm({ name: '', description: '', isActive: true })
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workoutCategoriesService.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workout-categories'] }),
  })

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Masters · Training"
        titleGradient="Workout Categories"
        subtitle="Smart warmup and stretch templates by training focus."
        primaryAction={{ label: '+ Create category', onClick: () => setModalOpen(true) }}
      >
        <DashboardTablePanel
          title="Categories"
          description={isLoading ? 'Loading…' : categories.length === 0 ? 'No categories yet.' : undefined}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Warmups</th>
                  <th className="px-4 py-3">Stretches</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: WorkoutCategorySummary) => (
                  <tr key={cat.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium text-white">{cat.name}</td>
                    <td className="px-4 py-3 text-slate-300">{cat.warmupCount}</td>
                    <td className="px-4 py-3 text-slate-300">{cat.stretchCount}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${cat.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/20 text-slate-400'}`}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/dashboard/training/workout-categories/${cat.id}`}>
                          <Button variant="soft" size="sm">Manage</Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-300"
                          onClick={() => {
                            if (window.confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id)
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
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create category">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.name.trim()) {
              setFormError('Name is required.')
              return
            }
            createMutation.mutate({ ...form, name: form.name.trim() })
          }}
        >
          {formError && <p className="text-sm text-rose-400">{formError}</p>}
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Textarea label="Description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
