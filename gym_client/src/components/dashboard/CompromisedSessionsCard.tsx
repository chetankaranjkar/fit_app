import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authService } from '../../services/auth.service'
import type { CompromisedSession } from '../../types/auth'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export function CompromisedSessionsCard({ className }: { className?: string }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['auth', 'compromised-sessions'],
    queryFn: async () => {
      const { data } = await authService.getCompromisedSessions()
      return Array.isArray(data) ? data : []
    },
    retry: false,
  })

  const sessions = useMemo(() => {
    return (data as CompromisedSession[]).slice(0, 5)
  }, [data])

  return (
    <div className={`glass-card min-w-0 rounded-2xl p-6 ${className || ''}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Compromised Sessions</h3>
          <p className="text-xs text-slate-400">Refresh-token reuse detections (security)</p>
        </div>
        <span className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200">
          {sessions.length} shown
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading security events…</div>
      ) : isError ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Could not load compromised sessions (permission required or API unavailable).
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
          No compromised refresh-session events detected.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="px-2 py-2 font-medium">User</th>
                <th className="px-2 py-2 font-medium">Compromised at</th>
                <th className="px-2 py-2 font-medium">Last login</th>
                <th className="px-2 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.authUserId} className="border-b border-white/5 text-slate-200">
                  <td className="px-2 py-2 align-top">
                    <p className="font-medium text-white">{s.fullName || 'Unknown user'}</p>
                    <p className="text-[11px] text-slate-400">{s.email}</p>
                  </td>
                  <td className="px-2 py-2">{formatDateTime(s.compromisedAt)}</td>
                  <td className="px-2 py-2">{formatDateTime(s.lastLoginTime)}</td>
                  <td className="px-2 py-2">{s.lastLoginIpAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
