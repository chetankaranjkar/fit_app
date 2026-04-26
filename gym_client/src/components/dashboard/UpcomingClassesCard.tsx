const classes = [
  {
    title: 'Morning HIIT',
    trainer: 'George Craig',
    time: '07:00 AM',
    duration: '45 min',
    members: 18,
    capacity: 24,
    accent: 'from-blue-500 to-cyan-400',
  },
  {
    title: 'Power Yoga',
    trainer: 'Annette Black',
    time: '09:30 AM',
    duration: '60 min',
    members: 12,
    capacity: 16,
    accent: 'from-purple-500 to-fuchsia-500',
  },
  {
    title: 'Strength & Core',
    trainer: 'Ralph Edwards',
    time: '06:00 PM',
    duration: '50 min',
    members: 22,
    capacity: 24,
    accent: 'from-pink-500 to-rose-500',
  },
]

export function UpcomingClassesCard({ className }: { className?: string }) {
  return (
    <div className={`glass-card min-w-0 rounded-2xl p-6 ${className || ''}`}>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Upcoming Classes</h3>
          <p className="text-xs text-slate-400">Today's schedule</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          Today
        </span>
      </div>

      <ul className="space-y-3">
        {classes.map((c) => {
          const pct = Math.round((c.members / c.capacity) * 100)
          return (
            <li
              key={c.title}
              className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/10 hover:bg-white/[0.05]"
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${c.accent}`}
              />
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{c.title}</p>
                  <p className="truncate text-xs text-slate-400">
                    by {c.trainer} · {c.duration}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{c.time}</p>
                  <p className="text-[11px] text-slate-400">
                    {c.members}/{c.capacity} booked
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${c.accent}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
