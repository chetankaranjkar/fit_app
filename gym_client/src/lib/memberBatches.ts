/** Preferred gym time shown as "batch" on trainer member views. */
export const MEMBER_BATCH_VALUES = ['Morning', 'Afternoon', 'Evening', 'Night'] as const

export type MemberBatchValue = (typeof MEMBER_BATCH_VALUES)[number]

export type MemberShiftFilter = 'all' | MemberBatchValue

export const MEMBER_BATCH_META: Record<
  MemberBatchValue,
  { label: string; barClass: string; dotClass: string; sparkClass: string }
> = {
  Morning: {
    label: 'Morning Batch',
    barClass: 'bg-gradient-to-r from-amber-400 to-yellow-300',
    dotClass: 'bg-amber-400',
    sparkClass: 'stroke-amber-400/60',
  },
  Afternoon: {
    label: 'Afternoon Batch',
    barClass: 'bg-gradient-to-r from-cyan-400 to-teal-400',
    dotClass: 'bg-cyan-400',
    sparkClass: 'stroke-cyan-400/60',
  },
  Evening: {
    label: 'Evening Batch',
    barClass: 'bg-gradient-to-r from-violet-500 to-purple-400',
    dotClass: 'bg-violet-400',
    sparkClass: 'stroke-violet-400/60',
  },
  Night: {
    label: 'Night Batch',
    barClass: 'bg-gradient-to-r from-blue-500 to-indigo-400',
    dotClass: 'bg-blue-400',
    sparkClass: 'stroke-blue-400/60',
  },
}

export const MEMBER_SHIFT_FILTER_OPTIONS: { value: MemberShiftFilter; label: string }[] = [
  { value: 'all', label: 'All Batches' },
  ...MEMBER_BATCH_VALUES.map((value) => ({
    value,
    label: MEMBER_BATCH_META[value].label,
  })),
]

/** Admin/staff directory — legacy shift labels. */
export const ADMIN_SHIFT_FILTER_OPTIONS: { value: MemberShiftFilter; label: string }[] = [
  { value: 'all', label: 'All shifts' },
  ...MEMBER_BATCH_VALUES.map((value) => ({ value, label: value })),
]

export function memberBatchLabel(preferredGymTime?: string | null): string {
  if (!preferredGymTime) return 'Unassigned'
  const key = preferredGymTime as MemberBatchValue
  return MEMBER_BATCH_META[key]?.label ?? preferredGymTime
}

export function memberBatchDotClass(preferredGymTime?: string | null): string {
  if (!preferredGymTime) return 'bg-slate-500'
  const key = preferredGymTime as MemberBatchValue
  return MEMBER_BATCH_META[key]?.dotClass ?? 'bg-slate-400'
}
