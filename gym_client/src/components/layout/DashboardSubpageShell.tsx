import { type ReactNode } from 'react'
import { DataPageShell } from './DataPageShell'

type PrimaryAction = { label: string; onClick: () => void }

/**
 * Shared page chrome for dashboard routes: gradient title, subtitle, optional Export + primary CTA (matches Dashboard / Users styling).
 */
export function DashboardSubpageShell({
  eyebrow,
  titleBefore = '',
  titleGradient,
  subtitle,
  primaryAction,
  showExport = true,
  children,
}: {
  eyebrow: string
  /** Text before the gradient span (e.g. "All ") */
  titleBefore?: string
  titleGradient: string
  subtitle: string
  primaryAction?: PrimaryAction
  /** Renders a non-functional Export button for visual parity with the main dashboard */
  showExport?: boolean
  children: ReactNode
}) {
  return (
    <DataPageShell>
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            {titleBefore}
            <span className="bg-[linear-gradient(135deg,#60a5fa,#c084fc)] bg-clip-text text-transparent">
              {titleGradient}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        {(showExport || primaryAction) && (
          <div className="flex items-center gap-2">
            {showExport && (
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Export
              </button>
            )}
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:brightness-110"
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden">{children}</div>
    </DataPageShell>
  )
}

/** Table shell: frosted panel + header row for list pages */
export function DashboardTablePanel({
  title,
  description = '',
  toolbar,
  children,
}: {
  title: string
  description?: string
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="glass-card dashboard-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
      <div className="shrink-0 border-b border-white/5 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white sm:text-base">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-slate-400">{description}</p> : null}
          </div>
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </section>
  )
}
