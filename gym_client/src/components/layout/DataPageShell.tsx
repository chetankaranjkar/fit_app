import type { ReactNode } from 'react'

/**
 * Fills the dashboard content viewport without page-level scroll.
 * Structure: fixed header/metrics/toolbar + scrollable body (typically EnterpriseDataGrid).
 */
export function DataPageShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        'flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-6 overflow-hidden',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

/** Non-scrolling block (title, KPI row, filters) */
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
