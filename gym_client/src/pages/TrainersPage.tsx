import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { Button } from '../components/ui/Button'
import { AddTrainerModal } from '../components/trainers/AddTrainerModal'
import { trainersService } from '../services/trainers.service'
import { trainerFullName } from '../types/trainer'
import type { Trainer } from '../types/trainer'

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

export function TrainersPage() {
  const navigate = useNavigate()
  const { userName } = getDashboardUser()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const { data: trainers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await trainersService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['trainer-stats'],
    queryFn: async () => (await trainersService.getStats()).data,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return trainers
    return trainers.filter((t: Trainer) => {
      const hay = [
        trainerFullName(t),
        t.email,
        t.phone,
        t.specialization,
        t.employeeCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [trainers, search])

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Staff"
        titleGradient="Trainers"
        subtitle="Trainer profiles are saved to the database (Trainer table, linked to Users). Create a member user first, then add them as a trainer."
        primaryAction={{ label: '+ Add trainer', onClick: () => setAddOpen(true) }}
        showExport={false}
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="glass-card rounded-2xl border border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Total trainers</p>
            <p className="mt-1 text-2xl font-semibold text-white">{stats?.totalTrainers ?? trainers.length}</p>
          </div>
          <div className="glass-card rounded-2xl border border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Active</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">
              {stats?.activeTrainers ?? trainers.filter((t) => t.isActive).length}
            </p>
          </div>
          <div className="glass-card rounded-2xl border border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">On leave</p>
            <p className="mt-1 text-2xl font-semibold text-amber-300">{stats?.onLeave ?? 0}</p>
          </div>
          <div className="glass-card rounded-2xl border border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Clients assigned</p>
            <p className="mt-1 text-2xl font-semibold text-white">{stats?.totalClientsAssigned ?? 0}</p>
          </div>
        </div>

        <input
          type="search"
          placeholder="Search name, email, specialization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100"
        />

        <DashboardTablePanel title="Trainer directory">
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading trainers…</p>
          ) : isError ? (
            <div className="px-6 py-8">
              <p className="text-sm text-rose-300">Could not load trainers. Is the API running?</p>
              <Button variant="soft" size="sm" className="mt-3" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">
              No trainers yet. Click &quot;+ Add trainer&quot; and select an existing user (create the user under Users first if needed).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Specialization</th>
                    <th className="px-6 py-3">Clients</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-6 py-3 font-medium text-white">{trainerFullName(t)}</td>
                      <td className="px-6 py-3 text-slate-300">{t.email || '—'}</td>
                      <td className="px-6 py-3 text-slate-300">{t.employeeCode ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-300">{t.specialization ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-300">
                        {t.totalClients}
                        {t.maxClients ? ` / ${t.maxClients}` : ''}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={
                            t.isActive
                              ? 'text-emerald-300'
                              : 'text-slate-500'
                          }
                        >
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => navigate(`/dashboard/trainers/${t.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <AddTrainerModal open={addOpen} onClose={() => setAddOpen(false)} />
    </DashboardLayout>
  )
}
