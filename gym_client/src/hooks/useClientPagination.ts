import { useEffect, useMemo } from 'react'

export function useClientPagination<T>(items: T[], page: number, pageSize: number) {
  const totalCount = items.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      // Caller should reset page when filters change; this guards stale page numbers.
    }
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return { pageItems, totalCount, totalPages, safePage, canGoPrev: safePage > 1, canGoNext: safePage < totalPages }
}
