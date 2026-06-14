type MembersPageHeaderProps = {
  title: string
  subtitle: string
  onExport: () => void
  onImport?: () => void
  onAdd?: () => void
  onTour?: () => void
  addWalkthroughId?: string
}

export function MembersPageHeader({
  title,
  subtitle,
  onExport,
  onImport,
  onAdd,
  onTour,
  addWalkthroughId,
}: MembersPageHeaderProps) {
  return (
    <header
      className="flex min-h-[56px] shrink-0 items-center justify-between gap-3 py-1.5 sm:py-2"
      data-walkthrough="members-header"
    >
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">{title}</h1>
        <p className="truncate text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        {onTour ? (
          <button
            type="button"
            onClick={onTour}
            className="hidden rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10 sm:inline-flex"
          >
            Tour
          </button>
        ) : null}
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 sm:px-3"
        >
          Export CSV
        </button>
        {onImport ? (
          <button
            type="button"
            onClick={onImport}
            className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/20 sm:px-3"
          >
            Import CSV
          </button>
        ) : null}
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            data-walkthrough={addWalkthroughId}
            className="rounded-lg bg-[linear-gradient(135deg,#3b82f6,#a855f7)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110 sm:px-3"
          >
            + Add Member
          </button>
        ) : null}
      </div>
    </header>
  )
}
