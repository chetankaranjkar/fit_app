import type { ReactNode } from 'react'

export type DataGridBreakpoint = 'sm' | 'md' | 'lg' | 'xl'

export type DataGridColumnDef<T> = {
  id: string
  header: string
  /** Fixed width in px; use minWidth for flexible columns */
  width?: number
  minWidth?: number
  maxWidth?: number
  /** Pin as first sticky column */
  sticky?: boolean
  sortable?: boolean
  filterable?: boolean
  /** Hide below breakpoint (horizontal scroll still available) */
  hideBelow?: DataGridBreakpoint
  align?: 'left' | 'center' | 'right'
  accessorFn?: (row: T) => string | number | boolean | null | undefined
  cell?: (ctx: { row: T; value: unknown }) => ReactNode
  /** Header filter placeholder */
  filterPlaceholder?: string
}

export type DataGridSortState = {
  id: string
  desc: boolean
} | null

export type RowAction<T> = {
  id: string
  label: string
  onClick: (row: T) => void
  variant?: 'default' | 'danger' | 'success' | 'warning'
  hidden?: (row: T) => boolean
  disabled?: (row: T) => boolean
}
