/** Web sidebar sections, in display order. Shared by admin, front-desk, and coach menus. */
export const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'billing', label: 'Memberships & Billing' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'attendance', label: 'Attendance & Access' },
  { id: 'retail', label: 'Retail' },
  { id: 'operations', label: 'Operations' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
] as const

export type NavSectionId = (typeof NAV_SECTIONS)[number]['id']

export type NavSectionBucket<T> = {
  id: NavSectionId | null
  label: string | null
  entries: T[]
}

/**
 * Buckets entries by `section` in `NAV_SECTIONS` order, keeping entry order within a section.
 * Entries without a section come first under a `null` heading; empty sections are omitted.
 */
export function groupBySection<T extends { section?: NavSectionId }>(
  entries: readonly T[],
): NavSectionBucket<T>[] {
  const buckets: NavSectionBucket<T>[] = []
  const unsectioned = entries.filter((e) => !e.section)
  if (unsectioned.length > 0) buckets.push({ id: null, label: null, entries: unsectioned })
  for (const section of NAV_SECTIONS) {
    const inSection = entries.filter((e) => e.section === section.id)
    if (inSection.length > 0) {
      buckets.push({ id: section.id, label: section.label, entries: inSection })
    }
  }
  return buckets
}
