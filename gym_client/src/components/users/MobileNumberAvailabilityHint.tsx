import type { MobileAvailabilityStatus } from '../../hooks/useMobileNumberAvailability'

type Props = {
  status: MobileAvailabilityStatus
  message: string | null
}

export function MobileNumberAvailabilityHint({ status, message }: Props) {
  if (!message || status === 'idle' || status === 'checking') {
    if (status === 'checking') {
      return <p className="mt-1 text-[11px] text-slate-500">Checking availability…</p>
    }
    return null
  }

  const className =
    status === 'available'
      ? 'mt-1 text-[11px] font-medium text-emerald-400'
      : status === 'taken'
        ? 'mt-1 text-[11px] font-medium text-rose-400'
        : 'mt-1 text-[11px] text-amber-400'

  return <p className={className}>{message}</p>
}
