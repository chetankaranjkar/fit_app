import type { UserProfileSummary } from '../types/userProfileSummary'

export type OnboardingStepId = 'profile' | 'membership' | 'payment' | 'coach' | 'workout' | 'diet'

/** `blocked` = prerequisite missing (see `blockedReason`); `attention` = needs fixing (expired, overdue, …). */
export type OnboardingStepStatus = 'done' | 'attention' | 'todo' | 'blocked'

export type OnboardingStepAction = { label: string; onClick?: () => void; to?: string }

export type OnboardingStep = {
  id: OnboardingStepId
  label: string
  required: boolean
  status: OnboardingStepStatus
  hint: string
  blockedReason?: string
  /** Omitted when the viewer lacks permission or the step is done/blocked. */
  action?: OnboardingStepAction
}

export type MemberOnboardingInput = {
  summary: UserProfileSummary | undefined
  profileComplete: boolean
  /** Fallback when the summary has not loaded (legacy flag). */
  hasActiveMembership: boolean
  /** Existing workout/diet eligibility (`memberCanReceiveTrainingServices`). */
  canAssignTrainingServices: boolean
  hasWorkoutAssignment: boolean
  hasDietAssignment: boolean
  hasAnyDietAssignment: boolean
  primaryDietPlanName: string | null
  coachName: string | null
  can: {
    editProfile: boolean
    manageBilling: boolean
    assignCoach: boolean
    assignTraining: boolean
  }
  actions: {
    editProfile: () => void
    manageMemberships: () => void
    collectPaymentHref: (membershipId: number) => string
    assignCoach: () => void
    assignWorkout: () => void
    assignDiet: () => void
  }
}

/** Statuses where the member holds a usable membership (payment may still be due). */
const MEMBERSHIP_IN_GOOD_STANDING = new Set(['Active', 'ActivePendingPayment', 'PartialPayment'])

const BILLING_STAFF_NOTE = 'Staff with billing access can do this.'
const TRAINING_STAFF_NOTE = 'A trainer or admin can do this.'

function formatDate(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function withNote(hint: string, allowed: boolean, note: string): string {
  return allowed ? hint : `${hint} ${note}`
}

function profileStep(input: MemberOnboardingInput): OnboardingStep {
  const done = input.profileComplete
  return {
    id: 'profile',
    label: 'Profile',
    required: true,
    status: done ? 'done' : 'todo',
    hint: done ? 'Name, email, and phone on file.' : 'Add name, email, and phone.',
    action: !done && input.can.editProfile ? { label: 'Edit profile', onClick: input.actions.editProfile } : undefined,
  }
}

function membershipStep(input: MemberOnboardingInput): OnboardingStep {
  const { summary, can, actions } = input
  const base = { id: 'membership' as const, label: 'Membership', required: true }
  const manage = (label: string) => (can.manageBilling ? { label, onClick: actions.manageMemberships } : undefined)

  if (!summary || summary.currentMembershipStatus === undefined) {
    return input.hasActiveMembership
      ? { ...base, status: 'done', hint: 'Active gym membership plan.' }
      : {
          ...base,
          status: 'todo',
          hint: withNote('Assign a membership plan.', can.manageBilling, BILLING_STAFF_NOTE),
          action: manage('Manage memberships'),
        }
  }

  const status = summary.currentMembershipStatus
  const plan = summary.currentMembershipPlanName?.trim() || 'Membership'
  const ends = formatDate(summary.currentMembershipEndDate)

  if (status && MEMBERSHIP_IN_GOOD_STANDING.has(status)) {
    return { ...base, status: 'done', hint: ends ? `${plan} · ends ${ends}` : plan }
  }
  if (status === 'Frozen') {
    return {
      ...base,
      status: 'attention',
      hint: withNote(`${plan} is frozen. Unfreeze it to restore access.`, can.manageBilling, BILLING_STAFF_NOTE),
      action: manage('Manage memberships'),
    }
  }
  if (status === 'Pending' || status === 'VoidPending') {
    return {
      ...base,
      status: 'attention',
      hint:
        status === 'Pending'
          ? `${plan} is awaiting approval.`
          : `A void was requested for ${plan} and is awaiting approval.`,
      action: manage('View memberships'),
    }
  }

  const lapsed = formatDate(summary.lapsedMembershipEndDate)
  if (lapsed) {
    return {
      ...base,
      status: 'attention',
      hint: withNote(`Expired on ${lapsed}. Renew to restore gym access.`, can.manageBilling, BILLING_STAFF_NOTE),
      action: manage('Renew membership'),
    }
  }
  return {
    ...base,
    status: 'todo',
    hint: withNote('Choose a plan from the plan catalog.', can.manageBilling, BILLING_STAFF_NOTE),
    action: manage('Add membership'),
  }
}

function paymentStep(input: MemberOnboardingInput, membership: OnboardingStep): OnboardingStep {
  const { summary, can, actions } = input
  const base = { id: 'payment' as const, label: 'Payment', required: true }

  if (membership.status !== 'done') {
    return {
      ...base,
      status: 'blocked',
      hint: 'Collect the membership fee.',
      blockedReason:
        membership.status === 'attention' && summary?.lapsedMembershipEndDate == null
          ? 'Resolve the membership status first.'
          : 'Add or renew a membership first.',
    }
  }

  if (!summary || summary.currentMembershipStatus === undefined) {
    return input.canAssignTrainingServices
      ? { ...base, status: 'done', hint: 'Membership is paid.' }
      : { ...base, status: 'todo', hint: withNote('Payment is pending.', can.manageBilling, BILLING_STAFF_NOTE) }
  }

  const collectFor = summary.openMembershipId ?? summary.currentMembershipId ?? null
  const collect =
    can.manageBilling && collectFor != null
      ? { label: 'Collect payment', to: actions.collectPaymentHref(collectFor) }
      : undefined

  if (summary.hasOpenBalance) {
    return {
      ...base,
      status: summary.isPaymentOverdue ? 'attention' : 'todo',
      hint: withNote(
        summary.isPaymentOverdue ? 'Payment is overdue.' : 'Balance due on the current membership.',
        can.manageBilling,
        BILLING_STAFF_NOTE,
      ),
      action: collect,
    }
  }
  if (summary.currentMembershipStatus === 'Active') {
    return { ...base, status: 'done', hint: 'Paid in full.' }
  }
  return {
    ...base,
    status: 'todo',
    hint: withNote('No payment recorded for this membership yet.', can.manageBilling, BILLING_STAFF_NOTE),
    action: collect,
  }
}

function trainingBlockedReason(payment: OnboardingStep): string {
  return payment.status === 'blocked'
    ? 'Needs an active, paid membership.'
    : 'Unlocks once the membership is paid.'
}

function coachStep(input: MemberOnboardingInput): OnboardingStep {
  const done = Boolean(input.coachName)
  return {
    id: 'coach',
    label: 'Coach',
    required: false,
    status: done ? 'done' : 'todo',
    hint: done ? `Coach: ${input.coachName}` : 'Assign a trainer to guide this member.',
    action: !done && input.can.assignCoach ? { label: 'Assign coach', onClick: input.actions.assignCoach } : undefined,
  }
}

function workoutStep(input: MemberOnboardingInput, payment: OnboardingStep): OnboardingStep {
  const base = { id: 'workout' as const, label: 'Workout', required: false }
  if (input.hasWorkoutAssignment) return { ...base, status: 'done', hint: 'Workout plan assigned.' }
  if (!input.canAssignTrainingServices) {
    return { ...base, status: 'blocked', hint: 'Assign a workout plan.', blockedReason: trainingBlockedReason(payment) }
  }
  return {
    ...base,
    status: 'todo',
    hint: withNote('Assign a workout plan.', input.can.assignTraining, TRAINING_STAFF_NOTE),
    action: input.can.assignTraining ? { label: 'Assign workout', onClick: input.actions.assignWorkout } : undefined,
  }
}

function dietStep(input: MemberOnboardingInput, payment: OnboardingStep): OnboardingStep {
  const base = { id: 'diet' as const, label: 'Diet', required: false }
  if (input.hasDietAssignment) {
    return {
      ...base,
      status: 'done',
      hint: input.primaryDietPlanName ? `Assigned: ${input.primaryDietPlanName}` : 'Nutrition plan assigned.',
    }
  }
  if (!input.canAssignTrainingServices) {
    return { ...base, status: 'blocked', hint: 'Assign a nutrition plan.', blockedReason: trainingBlockedReason(payment) }
  }
  const action = input.can.assignTraining
    ? { label: input.hasAnyDietAssignment ? 'Assign a current plan' : 'Assign diet plan', onClick: input.actions.assignDiet }
    : undefined
  return input.hasAnyDietAssignment
    ? {
        ...base,
        status: 'attention',
        hint: withNote('The diet assignment is inactive or outside its dates.', input.can.assignTraining, TRAINING_STAFF_NOTE),
        action,
      }
    : {
        ...base,
        status: 'todo',
        hint: withNote('Assign a nutrition plan.', input.can.assignTraining, TRAINING_STAFF_NOTE),
        action,
      }
}

/** Profile → Membership → Payment (required) → Coach → Workout → Diet (optional). */
export function buildMemberOnboardingSteps(input: MemberOnboardingInput): OnboardingStep[] {
  const membership = membershipStep(input)
  const payment = paymentStep(input, membership)
  return [
    profileStep(input),
    membership,
    payment,
    coachStep(input),
    workoutStep(input, payment),
    dietStep(input, payment),
  ]
}

/** First open step the member can move forward on now, in flow order. */
export function getNextOnboardingStep(steps: OnboardingStep[]): OnboardingStep | null {
  return steps.find((s) => s.status === 'attention' || s.status === 'todo') ?? null
}

export function getOnboardingProgress(steps: OnboardingStep[]) {
  const required = steps.filter((s) => s.required)
  const optional = steps.filter((s) => !s.required)
  return {
    requiredDone: required.filter((s) => s.status === 'done').length,
    requiredTotal: required.length,
    optionalDone: optional.filter((s) => s.status === 'done').length,
    optionalTotal: optional.length,
  }
}
