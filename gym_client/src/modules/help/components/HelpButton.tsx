import { useContext } from 'react'
import { CircleHelp } from 'lucide-react'
import { HelpUiContext } from '../HelpUiContext'

type HelpButtonProps = {
  /** Override inferred route module */
  moduleKey?: string
  className?: string
  /** Compact control for headers (floating help is the primary entry on dashboard). */
  size?: 'default' | 'sm'
}

/**
 * Inline trigger for the contextual help drawer (`/api/help/articles/module/{module_key}`).
 */
export function HelpButton({ moduleKey, className = '', size = 'default' }: HelpButtonProps) {
  const ctx = useContext(HelpUiContext)
  if (!ctx) return null
  const { openDrawer } = ctx
  const box = size === 'sm' ? 'size-8' : 'size-9'
  const icon = size === 'sm' ? 'size-4' : 'size-5'

  return (
    <button
      type="button"
      onClick={() => openDrawer(moduleKey)}
      className={`inline-flex ${box} items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white ${className}`}
      aria-label="Explain this page"
      title="Explain this page (?)"
    >
      <CircleHelp className={icon} strokeWidth={2} />
    </button>
  )
}
