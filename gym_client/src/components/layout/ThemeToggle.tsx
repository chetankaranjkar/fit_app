import { Moon, Sun } from 'lucide-react'
import { useDashboardTheme } from '../../lib/dashboardTheme'

export function ThemeToggle() {
  const { theme, busy, toggleTheme } = useDashboardTheme()
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={busy}
      aria-busy={busy}
      aria-label={label}
      title={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-wait disabled:opacity-60"
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}
