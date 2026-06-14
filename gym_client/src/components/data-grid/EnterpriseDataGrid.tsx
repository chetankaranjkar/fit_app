import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef as TanColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { DataGridColumnDef, DataGridSortState } from './types'
import type { ListPaginationProps } from '../ui/ListPagination'
import { ListPagination } from '../ui/ListPagination'

const ROW_HEIGHT = 52

const hideBelowClass: Record<NonNullable<DataGridColumnDef<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

function toTanColumns<T>(columns: DataGridColumnDef<T>[]): TanColumnDef<T, unknown>[] {
  return columns.map((col) => ({
    id: col.id,
    accessorFn: col.accessorFn ?? (() => ''),
    header: col.header,
    enableSorting: col.sortable === true,
    enableColumnFilter: col.filterable === true,
    filterFn: 'includesString',
    cell: (info) => {
      const row = info.row.original
      const value = col.accessorFn ? col.accessorFn(row) : info.getValue()
      return col.cell ? col.cell({ row, value }) : String(value ?? '—')
    },
    meta: col,
  }))
}

export function EnterpriseDataGrid<T>({
  data,
  columns,
  getRowId,
  loading = false,
  emptyMessage = 'No records found.',
  pagination,
  virtualize = false,
  estimateRowHeight = ROW_HEIGHT,
  stickyFirstColumn = true,
  enableColumnFilters = false,
  className = '',
  footer,
  chainScrollToParent = false,
}: {
  data: T[]
  columns: DataGridColumnDef<T>[]
  getRowId: (row: T) => string | number
  loading?: boolean
  emptyMessage?: string
  pagination?: Omit<ListPaginationProps, 'className'>
  virtualize?: boolean
  estimateRowHeight?: number
  stickyFirstColumn?: boolean
  /** Inline header filters — off by default when the page uses DataToolbar search/filters */
  enableColumnFilters?: boolean
  className?: string
  footer?: ReactNode
  /** When true, wheel at grid edges (or when grid has no overflow) scrolls the page shell */
  chainScrollToParent?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    columns.forEach((c) => {
      if (c.width) init[c.id] = c.width
    })
    return init
  })

  const tanColumns = useMemo(() => toTanColumns(columns), [columns])

  const table = useReactTable({
    data,
    columns: tanColumns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => String(getRowId(row)),
  })

  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()
  const filterable = enableColumnFilters && columns.some((c) => c.filterable)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 12,
    enabled: virtualize && rows.length > 0,
  })

  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => {
      const w = columnWidths[col.id] ?? col.width ?? col.minWidth ?? 120
      return sum + w
    }, 0)
  }, [columns, columnWidths])

  useEffect(() => {
    if (!chainScrollToParent) return
    const el = scrollRef.current
    if (!el) return

    const findScrollParent = () =>
      el.closest('.dashboard-scroll-area') as HTMLElement | null

    const onWheel = (e: WheelEvent) => {
      const parent = findScrollParent()
      if (!parent) return

      const maxScroll = el.scrollHeight - el.clientHeight
      const canScrollInside = maxScroll > 1
      const atTop = el.scrollTop <= 0
      const atBottom = el.scrollTop >= maxScroll - 1

      const shouldChainUp = e.deltaY < 0 && (!canScrollInside || atTop)
      const shouldChainDown = e.deltaY > 0 && (!canScrollInside || atBottom)

      if (shouldChainUp || shouldChainDown) {
        parent.scrollTop += e.deltaY
        e.preventDefault()
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [chainScrollToParent, loading, rows.length])

  const startResize = useCallback(
    (columnId: string, startX: number) => {
      const col = columns.find((c) => c.id === columnId)
      const startWidth = columnWidths[columnId] ?? col?.width ?? col?.minWidth ?? 120

      const onMove = (e: MouseEvent) => {
        const min = col?.minWidth ?? 72
        const max = col?.maxWidth ?? 480
        const next = Math.min(max, Math.max(min, startWidth + (e.clientX - startX)))
        setColumnWidths((prev) => ({ ...prev, [columnId]: next }))
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [columnWidths, columns],
  )

  const getColWidth = (col: DataGridColumnDef<T>) =>
    columnWidths[col.id] ?? col.width ?? col.minWidth ?? 120

  const stickyLeft = (colIndex: number) => {
    if (!stickyFirstColumn || colIndex > 0) return undefined
    let left = 0
    for (let i = 0; i < colIndex; i++) {
      left += getColWidth(columns[i])
    }
    return left
  }

  const renderHeaderCell = (header: (typeof headerGroups)[0]['headers'][0], colIndex: number) => {
    const meta = header.column.columnDef.meta as DataGridColumnDef<T>
    const width = getColWidth(meta)
    const canSort = header.column.getCanSort()
    const sorted = header.column.getIsSorted()
    const isSticky = stickyFirstColumn && (meta.sticky || colIndex === 0)

    return (
      <th
        key={header.id}
        scope="col"
        style={{
          width,
          minWidth: meta.minWidth ?? width,
          maxWidth: meta.maxWidth,
          ...(isSticky ? { left: stickyLeft(colIndex) } : {}),
        }}
        className={[
          'relative border-b border-white/[0.08] bg-[rgba(12,10,28,0.98)] px-3 text-left align-middle',
          meta.hideBelow ? hideBelowClass[meta.hideBelow] : '',
          meta.align === 'right' ? 'text-right' : meta.align === 'center' ? 'text-center' : '',
          isSticky ? 'sticky z-20' : 'z-10',
        ].join(' ')}
      >
        <div className="flex h-[50px] items-center gap-1 pr-2">
          <button
            type="button"
            className={[
              'flex min-w-0 flex-1 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400',
              canSort ? 'cursor-pointer hover:text-slate-200' : 'cursor-default',
            ].join(' ')}
            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
          >
            <span className="truncate">
              {flexRender(header.column.columnDef.header, header.getContext())}
            </span>
            {canSort ? (
              sorted === 'asc' ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 text-blue-300" />
              ) : sorted === 'desc' ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-blue-300" />
              ) : (
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
              )
            ) : null}
          </button>
          <span
            role="separator"
            aria-orientation="vertical"
            onMouseDown={(e) => {
              e.preventDefault()
              startResize(meta.id, e.clientX)
            }}
            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/30"
          />
        </div>
      </th>
    )
  }

  const renderFilterRow = () => {
    if (!filterable) return null
    return (
      <tr className="border-b border-white/[0.06]">
        {headerGroups[0]?.headers.map((header, colIndex) => {
          const meta = header.column.columnDef.meta as DataGridColumnDef<T>
          const width = getColWidth(meta)
          const isSticky = stickyFirstColumn && (meta.sticky || colIndex === 0)
          return (
            <th
              key={`filter-${header.id}`}
              className={[
                'bg-[rgba(12,10,28,0.95)] px-2 py-1',
                meta.hideBelow ? hideBelowClass[meta.hideBelow] : '',
                isSticky ? 'sticky z-20' : '',
              ].join(' ')}
              style={{
                width,
                minWidth: meta.minWidth ?? width,
                ...(isSticky ? { left: stickyLeft(colIndex) } : {}),
              }}
            >
              {meta.filterable ? (
                <input
                  type="text"
                  value={(header.column.getFilterValue() as string) ?? ''}
                  onChange={(e) => header.column.setFilterValue(e.target.value)}
                  placeholder={meta.filterPlaceholder ?? 'Filter…'}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-blue-400/40 focus:outline-none"
                />
              ) : null}
            </th>
          )
        })}
      </tr>
    )
  }

  const renderBodyRow = (rowIndex: number) => {
    const row = rows[rowIndex]
    if (!row) return null
    return (
      <tr
        key={row.id}
        className="group border-b border-white/[0.04] transition-colors hover:bg-violet-500/[0.05]"
      >
        {row.getVisibleCells().map((cell, colIndex) => {
          const meta = cell.column.columnDef.meta as DataGridColumnDef<T>
          const width = getColWidth(meta)
          const isSticky = stickyFirstColumn && (meta.sticky || colIndex === 0)
          const overflowVisible = meta.overflowVisible === true || meta.id === 'actions'
          return (
            <td
              key={cell.id}
              style={{
                width,
                minWidth: meta.minWidth ?? width,
                ...(isSticky ? { left: stickyLeft(colIndex) } : {}),
              }}
              className={[
                'h-[52px] px-3 align-middle text-sm text-slate-200',
                overflowVisible ? 'overflow-visible' : 'max-h-[52px] overflow-hidden',
                isSticky
                  ? 'sticky z-10 bg-[rgba(11,11,26,0.98)] group-hover:bg-[rgba(18,16,36,0.98)]'
                  : '',
                meta.hideBelow ? hideBelowClass[meta.hideBelow] : '',
                meta.align === 'right' ? 'text-right' : meta.align === 'center' ? 'text-center' : '',
              ].join(' ')}
            >
              <div className={overflowVisible ? 'max-w-full overflow-visible' : 'max-w-full truncate'}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div
        ref={scrollRef}
        className={[
          'data-grid-scroll min-h-0 flex-1 overflow-auto',
          chainScrollToParent ? 'overscroll-y-auto' : 'overscroll-contain',
        ].join(' ')}
        {...(chainScrollToParent ? {} : { 'data-lenis-prevent': true })}
      >
        {loading ? (
          <div className="flex items-center justify-center px-6 py-16 text-sm text-slate-400">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          <table
            className="w-full border-collapse text-left"
            style={{ tableLayout: 'fixed', minWidth: totalWidth }}
          >
            <thead className="sticky top-0 z-30">
              {headerGroups.map((hg) => (
                <tr key={hg.id}>{hg.headers.map((h, i) => renderHeaderCell(h, i))}</tr>
              ))}
              {renderFilterRow()}
            </thead>
            <tbody>
              {virtualize ? (
                <>
                  {virtualizer.getVirtualItems().length > 0 ? (
                    <tr aria-hidden>
                      <td
                        colSpan={columns.length}
                        style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0, padding: 0, border: 0 }}
                      />
                    </tr>
                  ) : null}
                  {virtualizer.getVirtualItems().map((vRow) => renderBodyRow(vRow.index))}
                  {virtualizer.getVirtualItems().length > 0 ? (
                    <tr aria-hidden>
                      <td
                        colSpan={columns.length}
                        style={{
                          height:
                            virtualizer.getTotalSize() -
                            (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                          padding: 0,
                          border: 0,
                        }}
                      />
                    </tr>
                  ) : null}
                </>
              ) : (
                rows.map((_, i) => renderBodyRow(i))
              )}
            </tbody>
          </table>
        )}
      </div>

      {(pagination || footer) && (
        <div className="shrink-0 border-t border-white/[0.08] bg-[rgba(12,10,28,0.98)] px-4 py-3 sm:px-6">
          {footer}
          {pagination ? (
            <ListPagination
              {...pagination}
              className="border-t-0 pt-0"
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

/** Export sort state helper for server-side sorting pages */
export function gridSortToState(sorting: SortingState): DataGridSortState {
  const first = sorting[0]
  if (!first) return null
  return { id: first.id, desc: first.desc }
}
