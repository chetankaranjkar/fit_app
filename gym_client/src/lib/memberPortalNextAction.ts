import {
  ADD_MEMBERSHIP_LABEL,
  PAY_OUTSTANDING_LABEL,
  RENEW_MEMBERSHIP_LABEL,
  type MembershipStanding,
  type StandingNextAction,
} from './membershipStanding'
import type { MeAssignedProgram } from '../services/me.service'

export type MemberTodayActionKind = 'pay' | 'renew' | 'resolve' | 'workout' | 'progress' | 'none'

export type MemberTodayAction = {
  kind: MemberTodayActionKind
  title: string
  detail: string
  href: string
  cta: string
}

export type TodayAssignedWorkout = {
  planId: number
  planName: string
  dayName: string
  isRestDay: boolean
  exerciseCount: number
}

/** ISO weekday Mon=1 … Sun=7, matching assigned plan `dayNumber`. */
export function getTodayIsoDay(asOf = new Date()): number {
  const d = asOf.getDay()
  return d === 0 ? 7 : d
}

export function findTodayAssignedWorkout(
  programs: MeAssignedProgram[] | undefined,
  asOf = new Date(),
): TodayAssignedWorkout | null {
  if (!programs?.length) return null
  const iso = getTodayIsoDay(asOf)
  for (const program of programs) {
    const day = program.days.find((d) => d.dayNumber === iso)
    if (!day) continue
    return {
      planId: program.plan.id,
      planName: program.plan.planName,
      dayName: day.name,
      isRestDay: day.isRestDay,
      exerciseCount: day.exercises.length,
    }
  }
  return null
}

export function memberFacingStandingNext(next: StandingNextAction): { title: string; detail: string } {
  if (next.kind === 'collect') {
    return { title: PAY_OUTSTANDING_LABEL, detail: next.detail }
  }
  if (next.kind === 'renew') {
    const isAdd = next.label === ADD_MEMBERSHIP_LABEL
    return {
      title: isAdd ? ADD_MEMBERSHIP_LABEL : RENEW_MEMBERSHIP_LABEL,
      detail: isAdd
        ? 'Ask the front desk to add a membership so you can use the gym.'
        : `${next.detail} Ask the front desk to renew — paying a balance does not add gym time.`,
    }
  }
  if (next.kind === 'resolve') {
    if (next.label.includes('Unfreeze')) {
      return {
        title: 'Membership paused',
        detail: 'Gym access is paused. Ask the front desk to restore it.',
      }
    }
    return {
      title: 'Awaiting gym review',
      detail: 'Your membership is waiting on gym approval. Access stays closed until they finish.',
    }
  }
  return { title: next.label, detail: next.detail }
}

function progressAction(): MemberTodayAction {
  return {
    kind: 'progress',
    title: 'Log your progress',
    detail: 'No recorded body metrics yet. Add a weigh-in so you and your coach can track change.',
    href: '/dashboard/member/progress',
    cta: 'Log progress',
  }
}

/**
 * Single next step for the member home. Billing/access from membership standing first,
 * then today's assigned workout, then logging recorded progress. Not a task engine.
 */
export function resolveMemberTodayAction(input: {
  standing: MembershipStanding | null
  todayAssigned: TodayAssignedWorkout | null
  hasRecordedBodyMetric: boolean
}): MemberTodayAction {
  const standing = input.standing
  if (standing && standing.next.kind !== 'none') {
    const copy = memberFacingStandingNext(standing.next)
    if (standing.next.kind === 'collect') {
      return {
        kind: 'pay',
        title: copy.title,
        detail: copy.detail,
        href: '/dashboard/member/pay',
        cta: 'Pay now',
      }
    }
    if (standing.next.kind === 'renew') {
      return {
        kind: 'renew',
        title: copy.title,
        detail: copy.detail,
        href: '/dashboard/member/pay',
        cta: 'View membership',
      }
    }
    return {
      kind: 'resolve',
      title: copy.title,
      detail: copy.detail,
      href: '/dashboard/member/pay',
      cta: 'View membership',
    }
  }

  if (
    standing?.access.allowed &&
    input.todayAssigned &&
    !input.todayAssigned.isRestDay &&
    input.todayAssigned.exerciseCount > 0
  ) {
    return {
      kind: 'workout',
      title: 'Today’s assigned workout',
      detail: `${input.todayAssigned.planName} · ${input.todayAssigned.dayName}`,
      href: `/dashboard/member/workouts/today?planId=${input.todayAssigned.planId}`,
      cta: 'Start workout',
    }
  }

  if (standing?.access.allowed && input.todayAssigned?.isRestDay) {
    if (!input.hasRecordedBodyMetric) return progressAction()
    return {
      kind: 'none',
      title: 'Recovery day',
      detail: 'Today is a rest day on your assigned plan. Check-ins still count as recorded visits.',
      href: '/dashboard/member/workouts',
      cta: 'View assigned plan',
    }
  }

  if (!input.hasRecordedBodyMetric) return progressAction()

  return {
    kind: 'none',
    title: 'You’re all set for today',
    detail: 'Membership, access, and billing look current. Open Workouts for your assigned plan.',
    href: '/dashboard/member/workouts',
    cta: 'View workouts',
  }
}
