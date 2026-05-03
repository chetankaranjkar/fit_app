/** Normalize camera / paste payloads to the raw GUID token string. */
export function normalizeScannedQrPayload(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed)
      return u.searchParams.get('t') ?? u.searchParams.get('token') ?? trimmed
    }
  } catch {
    // fall through — treat as opaque text
  }

  return trimmed.replace(/^"+|"+$/g, '').trim()
}
