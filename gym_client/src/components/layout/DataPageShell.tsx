import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isDataGridViewportRoute } from '../../lib/dashboardScrollMode'

/**
 * Page shell for dashboard routes.
 * - Scroll mode (default): content flows and the layout main area scrolls.
 * - Viewport lock: fills height; used with EnterpriseDataGrid so only the grid scrolls.
 */
export function DataPageShell({
  children,
  className = '',
  lockViewport,
}: {
  children: ReactNode
  className?: string
  /** When true, fill viewport without page scroll. Auto-detected from route when omitted. */
  lockViewport?: boolean
}) {
  const { pathname } = useLocation()
  const lock = lockViewport ?? isDataGridViewportRoute(pathname)

  if (lock) {
    return (
      <div
        className={[
          'flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden',
          className,
        ].join(' ')}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={['min-w-0 w-full max-w-full flex flex-col gap-6', className].join(' ')}>
      {children}
    </div>
  )
}

/** Non-scrolling block (title, KPI row, filters) — viewport-lock pages only */
export function DataPageSection({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`shrink-0 min-w-0 ${className}`}>{children}</div>
}

/** Grows to fill remaining height; only children marked flex-1 should scroll */
export function DataPageBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

/** Standard scrollable page wrapper for routes that do not use DashboardSubpageShell */
export function DashboardPageContent({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        'mx-auto min-w-0 w-full max-w-[1600px] space-y-6 pb-8 sm:space-y-8 sm:pb-12',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
