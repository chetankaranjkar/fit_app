import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { ptSessionsService } from '../../../services/personalTraining.service'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return u?.fullName?.trim() || u?.username?.trim() || 'User'
  } catch {
    return 'User'
  }
}

export function PtSessionsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['pt-sessions', from, to, page],
    queryFn: async () =>
      (await ptSessionsService.search({
        page,
        pageSize: 20,
        fromUtc: from ? new Date(from).toISOString() : undefined,
        toUtc: to ? new Date(to).toISOString() : undefined,
      })).data,
  })

  const items = data?.items ?? []

  return (
    <DashboardLayout userName={getDashboardUser()}>
      <DashboardSubpageShell eyebrow="Personal Training" titleGradient="Session calendar" subtitle="Booked and completed PT sessions.">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
        </div>
        <DashboardTablePanel title="Sessions">
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="px-6 py-3 text-left">When</th>
                  <th className="px-6 py-3 text-left">Member</th>
                  <th className="px-6 py-3 text-left">Trainer</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="px-6 py-3 text-white">{new Date(s.scheduledStartUtc).toLocaleString()}</td>
                    <td className="px-6 py-3">{s.memberName}</td>
                    <td className="px-6 py-3">{s.trainerName}</td>
                    <td className="px-6 py-3">{s.status}</td>
                    <td className="px-6 py-3">{s.remainingSessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
