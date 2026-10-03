import type { ChannelReadiness } from '../../types/notificationChannels'

const styles: Record<ChannelReadiness, string> = {
  Ready: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  Disabled: 'border-white/15 bg-white/5 text-slate-400',
  Unconfigured: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
}

export function ChannelReadinessBadge({ readiness }: { readiness: ChannelReadiness | string }) {
  const key: ChannelReadiness =
    readiness === 'Disabled' || readiness === 'Unconfigured' || readiness === 'Ready' ? readiness : 'Unconfigured'
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[key]}`}>
      {key}
    </span>
  )
}
