import { type ReactNode, type Ref } from 'react'

/** Responsive metric/KPI grids — avoids cramped 6-column layouts until very wide viewports. */
const GRID_BY_COLS = {
  6: 'grid w-full min-w-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6',
  5: 'grid w-full min-w-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  4: 'grid w-full min-w-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4',
  3: 'grid w-full min-w-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3',
  2: 'grid w-full min-w-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2',
} as const

export type DashboardMetricsGridCols = keyof typeof GRID_BY_COLS

export function DashboardMetricsGrid({
  cols = 4,
  className = '',
  children,
  innerRef,
}: {
  cols?: DashboardMetricsGridCols
  className?: string
  children: ReactNode
  innerRef?: Ref<HTMLDivElement>
}) {
  return (
    <div ref={innerRef} className={`${GRID_BY_COLS[cols]} ${className}`.trim()}>
      {children}
    </div>
  )
}
