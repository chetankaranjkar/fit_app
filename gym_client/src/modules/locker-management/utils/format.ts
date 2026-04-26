/**
 * Tiny formatter helpers scoped to the Locker Management module.
 * Kept local to preserve isolation.
 */

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const daysUntil = (iso: string): number => {
  const DAY_MS = 86400000
  return Math.round((new Date(iso).getTime() - Date.now()) / DAY_MS)
}

export const isExpired = (iso: string): boolean =>
  new Date(iso).getTime() < Date.now()
