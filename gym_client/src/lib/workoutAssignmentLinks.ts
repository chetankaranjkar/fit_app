/** Safe in-app return path for trainer profile → Clients tab. */
export function trainerClientsReturnPath(trainerId: number): string {
  return `/dashboard/trainers/${trainerId}?tab=clients`
}

/** Open workout assignments with member (+ optional coach) pre-filled. */
export function workoutAssignmentUrl(options: {
  userId: number
  trainerId?: number
  returnTo?: string
}): string {
  const params = new URLSearchParams()
  params.set('userId', String(options.userId))
  if (options.trainerId != null && options.trainerId > 0) {
    params.set('trainerId', String(options.trainerId))
  }
  if (options.returnTo) {
    params.set('returnTo', options.returnTo)
  }
  return `/dashboard/training/workout-assignments?${params.toString()}`
}

/** Bulk assign the same program to multiple members (comma-separated ids). */
export function bulkWorkoutAssignmentUrl(options: {
  userIds: number[]
  trainerId?: number
  returnTo?: string
}): string | null {
  const ids = Array.from(new Set(options.userIds.filter((id) => id > 0)))
  if (ids.length === 0) return null
  const params = new URLSearchParams()
  params.set('memberIds', ids.join(','))
  if (options.trainerId != null && options.trainerId > 0) {
    params.set('trainerId', String(options.trainerId))
  }
  if (options.returnTo) {
    params.set('returnTo', options.returnTo)
  }
  return `/dashboard/training/workout-assignments?${params.toString()}`
}

export function workoutAssignmentReturnLabel(returnTo: string | null): string {
  return trainingReturnLabel(returnTo)
}

/** Open member workout timeline (memberId accepts Users.Id or Members.Id). */
export function memberWorkoutTimelineUrl(options: {
  memberId: number
  trainerId?: number
  returnTo?: string
}): string {
  const params = new URLSearchParams()
  if (options.trainerId != null && options.trainerId > 0) {
    params.set('trainerId', String(options.trainerId))
  }
  if (options.returnTo) {
    params.set('returnTo', options.returnTo)
  }
  const qs = params.toString()
  return `/dashboard/training/member-workouts/${options.memberId}${qs ? `?${qs}` : ''}`
}

export function trainerWorkoutsReviewUrl(options?: { returnTo?: string }): string {
  const params = new URLSearchParams()
  if (options?.returnTo) {
    params.set('returnTo', options.returnTo)
  }
  const qs = params.toString()
  return `/dashboard/training/workouts-to-review${qs ? `?${qs}` : ''}`
}

export function trainingReturnLabel(returnTo: string | null): string {
  if (!returnTo) return 'Back'
  if (returnTo.includes('/trainers/') && /tab=clients/i.test(returnTo)) {
    return 'Back to trainer clients'
  }
  if (returnTo.includes('/workouts-to-review')) return 'Back to workouts to review'
  if (returnTo.includes('/users/')) return 'Back to member'
  return 'Back'
}
