/** Canonical backend codes (must match LeadService). */
export type LeadSourceCode =
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'GOOGLE_SEARCH'
  | 'YOUTUBE'
  | 'WHATSAPP'
  | 'FRIEND_REFERENCE'
  | 'WALK_IN'
  | 'BANNER_POSTER'
  | 'WEBSITE'
  | 'TRAINER_REFERENCE'
  | 'EXISTING_MEMBER'
  | 'OTHER'

export const LEAD_SOURCE_OPTIONS: { value: LeadSourceCode; label: string; icon: LeadSourceIconKey }[] = [
  { value: 'FACEBOOK', label: 'Facebook', icon: 'facebook' },
  { value: 'INSTAGRAM', label: 'Instagram', icon: 'instagram' },
  { value: 'GOOGLE_SEARCH', label: 'Google Search', icon: 'google' },
  { value: 'YOUTUBE', label: 'YouTube', icon: 'youtube' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: 'whatsapp' },
  { value: 'FRIEND_REFERENCE', label: 'Friend Reference', icon: 'friend' },
  { value: 'WALK_IN', label: 'Walk-in', icon: 'walkin' },
  { value: 'BANNER_POSTER', label: 'Banner/Poster', icon: 'banner' },
  { value: 'WEBSITE', label: 'Website', icon: 'website' },
  { value: 'TRAINER_REFERENCE', label: 'Trainer Reference', icon: 'trainer' },
  { value: 'EXISTING_MEMBER', label: 'Existing Member', icon: 'member' },
  { value: 'OTHER', label: 'Other', icon: 'other' },
]

export type LeadSourceIconKey =
  | 'facebook'
  | 'instagram'
  | 'google'
  | 'youtube'
  | 'whatsapp'
  | 'friend'
  | 'walkin'
  | 'banner'
  | 'website'
  | 'trainer'
  | 'member'
  | 'other'

const LABEL_BY_CODE = Object.fromEntries(LEAD_SOURCE_OPTIONS.map((o) => [o.value, o.label])) as Record<
  LeadSourceCode,
  string
>

export function leadSourceLabel(code: string | null | undefined): string {
  if (code == null || code === '') return ''
  const u = code.trim().toUpperCase() as LeadSourceCode
  return LABEL_BY_CODE[u] ?? code
}

/** Single line for cards / tables — shows custom text when OTHER. */
export function formatLeadSourceDisplay(lead: {
  leadSource?: string | null
  customLeadSource?: string | null
}): string {
  if (!lead.leadSource?.trim()) return '—'
  const u = lead.leadSource.trim().toUpperCase()
  if (u === 'OTHER') {
    const c = lead.customLeadSource?.trim()
    return c || 'Other'
  }
  return leadSourceLabel(lead.leadSource) || lead.leadSource
}

/** For edit form: map DB row to combobox + custom field. */
export function resolveLeadSourceForForm(
  leadSource: string | null | undefined,
  customLeadSource: string | null | undefined,
): { code: string; custom: string } {
  if (!leadSource?.trim()) return { code: '', custom: '' }
  const u = leadSource.trim().toUpperCase()
  const known = LEAD_SOURCE_OPTIONS.some((o) => o.value === u)
  if (known)
    return { code: u, custom: u === 'OTHER' ? (customLeadSource ?? '').trim() : '' }
  return { code: 'OTHER', custom: leadSource.trim() }
}
