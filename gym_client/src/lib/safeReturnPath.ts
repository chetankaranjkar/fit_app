/**
 * Decodes ?returnTo= for in-app redirects only (mitigates open redirects).
 */
export function getSafeDashboardReturnPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
    const lower = decoded.toLowerCase()
    if (!lower.startsWith('/dashboard')) return null
    if (decoded.includes('://')) return null
    return decoded
  } catch {
    return null
  }
}

/** Comma- or +-separated member ids from ?memberIds= */
export function parseMemberIdsQuery(raw: string | null | undefined): number[] {
  const ids = String(raw ?? '')
    .split(/[,+]/)
    .map((x) => Number.parseInt(x.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0)
  return Array.from(new Set(ids))
}
