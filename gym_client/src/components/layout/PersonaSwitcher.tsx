import { useEffect, useRef, useState } from 'react'
import { usePersona } from '../../features/auth/DashboardRoleContext'
import { getPersonaLabel, type DashboardRole } from '../../features/auth/roleRouting'

const personaAccent: Record<DashboardRole, string> = {
  admin: 'text-blue-200',
  trainer: 'text-orange-200',
  member: 'text-amber-200',
  other: 'text-cyan-200',
}

function PersonaLabel({ activePersona }: { activePersona: DashboardRole }) {
  return (
    <>
      <span className="hidden text-[10px] uppercase tracking-wider text-slate-500 sm:inline">
        Viewing as
      </span>
      <span className={`font-semibold text-white ${personaAccent[activePersona]}`}>
        {getPersonaLabel(activePersona)}
      </span>
    </>
  )
}

/**
 * Header persona control — always visible; dropdown only when multiple personas exist.
 */
export function PersonaSwitcher() {
  const { activePersona, availablePersonas, setActivePersona } = usePersona()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const canSwitch = availablePersonas.length > 1

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = rootRef.current
      if (!root || !(e.target instanceof Node) || root.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  if (!canSwitch) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs sm:px-3"
        aria-label={`Viewing as ${getPersonaLabel(activePersona)}`}
      >
        <PersonaLabel activePersona={activePersona} />
      </div>
    )
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium transition hover:bg-white/10 sm:px-3"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch viewing role"
      >
        <PersonaLabel activePersona={activePersona} />
        <svg
          className={`size-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Available roles"
          className="absolute right-0 top-full z-40 mt-2 min-w-42 rounded-xl border border-white/10 bg-[rgba(17,17,39,0.97)] p-1 shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          {availablePersonas.map((persona) => {
            const selected = persona === activePersona
            return (
              <button
                key={persona}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setActivePersona(persona)
                  setOpen(false)
                }}
                className={[
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
                  selected
                    ? 'bg-white/10 font-semibold text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                <span>{getPersonaLabel(persona)}</span>
                {selected ? (
                  <svg className="size-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
