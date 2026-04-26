import type { ReactNode } from 'react'
import { IconInbox } from './Icons'

export function EmptyState({
  icon,
  title = 'No data available',
  message,
}: {
  icon?: ReactNode
  title?: ReactNode
  message?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
      <div className="inline-flex size-11 items-center justify-center rounded-xl bg-white/5 text-slate-400">
        {icon ?? <IconInbox className="size-5" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        {message && <p className="mt-1 text-xs text-slate-400">{message}</p>}
      </div>
    </div>
  )
}
