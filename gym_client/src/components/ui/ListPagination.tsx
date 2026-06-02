export interface ListPaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  isFetching?: boolean
  className?: string
}

export function ListPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  isFetching = false,
  className = '',
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const canGoPrev = page > 1
  const canGoNext = page < totalPages
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 ${className}`}
    >
      <p className="text-xs text-slate-400">
        Page {page} of {totalPages} · Showing {from}–{to} of {totalCount}
        {isFetching ? ' · Refreshing…' : ''}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={!canGoPrev}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={!canGoNext}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
