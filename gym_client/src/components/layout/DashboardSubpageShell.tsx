import { type ReactNode } from 'react'

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
    <div className="min-w-0 max-w-[100%] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
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
      {children}
    </div>
  )
}

/** Table shell: frosted panel + header row for list pages */
export function DashboardTablePanel({
  title,
  description,
  toolbar,
  children,
}: {
  title: string
  description: string
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="glass-card dashboard-card min-w-0 rounded-2xl">
      <div className="border-b border-white/5 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      </div>
      {children}
    </section>
  )
}
