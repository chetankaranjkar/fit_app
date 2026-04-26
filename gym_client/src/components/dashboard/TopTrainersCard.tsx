import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { trainersService } from '../../services/trainers.service'
import type { Trainer } from '../../types/trainer'

const gradients = [
  'from-blue-500 to-purple-500',
  'from-fuchsia-500 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
]

function StarRating({ value }: { value: number | null }) {
  const safe = value ?? 0
  const full = Math.round(safe)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < full ? 'text-amber-300' : 'text-slate-600'}
          style={i < full ? { textShadow: '0 0 6px rgba(251,191,36,0.4)' } : undefined}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-300">
        {value != null ? safe.toFixed(1) : 'N/A'}
      </span>
    </div>
  )
}

export function TopTrainersCard({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { data: trainers = [], isLoading } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await trainersService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const topTrainers = useMemo(() => {
    return (trainers as Trainer[])
      .filter((t) => t.isActive)
      .sort((a, b) => {
        const aRating = a.rating ?? -1
        const bRating = b.rating ?? -1
        if (aRating !== bRating) return bRating - aRating
        return (b.totalClients ?? 0) - (a.totalClients ?? 0)
      })
      .slice(0, 4)
      .map((t, idx) => ({
        id: t.id,
        name: `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || 'Unknown Trainer',
        specialty: t.specialization || 'General Fitness',
        users: t.totalClients ?? 0,
        rating: t.rating ?? null,
        gradient: gradients[idx % gradients.length],
      }))
  }, [trainers])

  return (
    <div className={`glass-card min-w-0 rounded-2xl p-6 ${className || ''}`}>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Top Rated Trainers</h3>
          <p className="text-xs text-slate-400">Highest performers this month</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/trainers')}
          className="text-xs font-semibold text-blue-300 transition hover:text-blue-200"
        >
          View all →
        </button>
      </div>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading top trainers…</div>
      ) : topTrainers.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">
          No active trainers available yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {topTrainers.map((t) => {
          const initials = t.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
          return (
            <li
              key={t.id}
              onClick={() => navigate(`/dashboard/trainers/${t.id}`)}
              className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/10 hover:bg-white/[0.05]"
            >
              <div
                className={`flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} text-sm font-bold text-white shadow-lg`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {t.specialty} · {t.users} active users
                </p>
              </div>
              <StarRating value={t.rating} />
            </li>
          )
          })}
        </ul>
      )}
    </div>
  )
}
