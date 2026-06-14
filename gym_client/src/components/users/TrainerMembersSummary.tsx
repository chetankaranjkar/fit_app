import { MembersSummaryStrip, type MembersSummaryStripProps } from './MembersSummaryStrip'

/** Coach-scoped summary strip. */
export function TrainerMembersSummary(props: Omit<MembersSummaryStripProps, 'variant'>) {
  return <MembersSummaryStrip variant="coach" {...props} />
}
