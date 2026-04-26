import { IconCheck } from './Icons'

/**
 * Step progress indicator for multi-step modals.
 * `current` is 0-indexed. Dots animate via Tailwind transition when `current` changes.
 */
export function StepProgressBar({
  steps,
  current,
}: {
  steps: string[]
  current: number
}) {
  return (
    <div className="px-1 pt-1">
      <div className="flex items-center gap-2">
        {steps.map((label, idx) => {
          const done = idx < current
          const active = idx === current
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={[
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-300',
                  done
                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                    : active
                      ? 'border-blue-400/40 bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-white shadow-[0_0_0_4px_rgba(59,130,246,0.15)]'
                      : 'border-white/10 bg-white/5 text-slate-400',
                ].join(' ')}
              >
                {done ? <IconCheck className="size-3.5" /> : idx + 1}
              </div>
              <div
                className={`hidden min-w-0 flex-1 text-xs font-medium transition md:block ${
                  active ? 'text-white' : done ? 'text-emerald-200' : 'text-slate-500'
                }`}
              >
                <span className="truncate">{label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="h-px flex-1 overflow-hidden rounded-full bg-white/5 md:ml-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      done
                        ? 'w-full bg-gradient-to-r from-emerald-400 to-teal-500'
                        : active
                          ? 'w-1/2 bg-gradient-to-r from-blue-500 to-purple-500'
                          : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
