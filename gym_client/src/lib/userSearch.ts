/** Shared member search UX rules (Users page, global search). */
export const MEMBER_SEARCH_MIN_CHARS = 3
export const MEMBER_SEARCH_DEBOUNCE_MS = 500

export function effectiveMemberSearchTerm(raw: string): string | undefined {
  const trimmed = raw.trim()
  return trimmed.length >= MEMBER_SEARCH_MIN_CHARS ? trimmed : undefined
}
