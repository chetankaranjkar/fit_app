import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useHelpTooltip } from '../hooks/useHelp'

type HelpTooltipProps = {
  helpKey: string
  /** Accessible label for the trigger */
  label?: string
  className?: string
}

/**
 * Small info icon; on hover fetches `/api/help/tooltips/{helpKey}` and shows a floating tooltip.
 */
export function HelpTooltip({ helpKey, label = 'More info', className = '' }: HelpTooltipProps) {
  const id = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const { data, isFetching } = useHelpTooltip(helpKey, open)

  const positionTooltip = () => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const maxLeft = Math.max(12, Math.min(r.left, window.innerWidth - 12 - 280))
    setCoords({ top: r.bottom + 8, left: maxLeft })
  }

  return (
    <span ref={wrapRef} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        className="inline-flex size-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
        aria-describedby={open ? id : undefined}
        aria-label={label}
        onMouseEnter={() => {
          positionTooltip()
          setOpen(true)
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          positionTooltip()
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
      >
        <Info className="size-3.5" strokeWidth={2} />
      </button>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                id={id}
                role="tooltip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none fixed z-[220] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-white/10 bg-[rgba(15,23,42,0.96)] px-3 py-2 text-xs leading-snug text-slate-100 shadow-xl shadow-black/40 backdrop-blur-md dark:border-white/10"
                style={{ top: coords.top, left: coords.left }}
              >
                {isFetching ? (
                  <span className="text-slate-400">Loading…</span>
                ) : (
                  data?.text ?? '—'
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  )
}
