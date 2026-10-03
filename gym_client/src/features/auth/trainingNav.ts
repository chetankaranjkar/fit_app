import { authService } from '../../services/auth.service'
import { canAccessWorkoutMonitoringNav } from './navPermissions'

export type TrainingNavNode =
  | { kind: 'link'; path: string; label: string; visible?: () => boolean }
  | { kind: 'heading'; label: string }

export const TRAINING_CATALOG_HEADING = 'Catalog & audit'

export const TRAINING_JOURNEY_PATHS = {
  plan: '/dashboard/training/programs',
  assign: '/dashboard/training/workout-assignments',
  monitor: '/dashboard/training/workout-monitoring',
  review: '/dashboard/training/workouts-to-review',
} as const

export type TrainingJourneyStepId = keyof typeof TRAINING_JOURNEY_PATHS

/**
 * Coaching Training group: Plan → Assign → Monitor → Review, then catalog/audit tools.
 * URLs are unchanged. Monitor is omitted for coach-only menus (gym-wide API is admin-scoped).
 */
export function getTrainingNavNodes(options: { includeMonitor: boolean }): TrainingNavNode[] {
  const nodes: TrainingNavNode[] = [
    { kind: 'link', path: TRAINING_JOURNEY_PATHS.plan, label: 'Plans' },
    { kind: 'link', path: TRAINING_JOURNEY_PATHS.assign, label: 'Assign' },
  ]
  if (options.includeMonitor) {
    nodes.push({
      kind: 'link',
      path: TRAINING_JOURNEY_PATHS.monitor,
      label: 'Monitor',
      visible: canAccessWorkoutMonitoringNav,
    })
  }
  nodes.push({ kind: 'link', path: TRAINING_JOURNEY_PATHS.review, label: 'Review' })
  nodes.push({ kind: 'heading', label: TRAINING_CATALOG_HEADING })
  nodes.push(
    { kind: 'link', path: '/dashboard/training/exercises', label: 'Exercises' },
    { kind: 'link', path: '/dashboard/training/body-parts', label: 'Body parts' },
    { kind: 'link', path: '/dashboard/training/warmups', label: 'Warmups' },
    { kind: 'link', path: '/dashboard/training/stretches', label: 'Stretches' },
    { kind: 'link', path: '/dashboard/training/workout-categories', label: 'Workout categories' },
    {
      kind: 'link',
      path: '/dashboard/training/workout-plan-audit',
      label: 'Workout Plan Audit',
      visible: () => authService.hasPermission('VIEW_WORKOUT_PLAN_AUDIT'),
    },
  )
  return nodes
}

export function pruneTrainingNavNodes<T extends { kind?: string; visible?: () => boolean }>(
  nodes: readonly T[],
): T[] {
  const visible = nodes.filter((n) => n.kind === 'heading' || !n.visible || n.visible())
  const out: T[] = []
  for (let i = 0; i < visible.length; i += 1) {
    const node = visible[i]
    if (node.kind !== 'heading') {
      out.push(node)
      continue
    }
    let hasLink = false
    for (let j = i + 1; j < visible.length; j += 1) {
      if (visible[j].kind === 'heading') break
      hasLink = true
    }
    if (hasLink) out.push(node)
  }
  return out
}

export function getTrainingJourneySteps(): { id: TrainingJourneyStepId; label: string; path: string }[] {
  const steps: { id: TrainingJourneyStepId; label: string; path: string }[] = [
    { id: 'plan', label: 'Plan', path: TRAINING_JOURNEY_PATHS.plan },
    { id: 'assign', label: 'Assign', path: TRAINING_JOURNEY_PATHS.assign },
  ]
  if (canAccessWorkoutMonitoringNav()) {
    steps.push({ id: 'monitor', label: 'Monitor', path: TRAINING_JOURNEY_PATHS.monitor })
  }
  steps.push({ id: 'review', label: 'Review', path: TRAINING_JOURNEY_PATHS.review })
  return steps
}

export function trainingJourneyStepFromPath(pathname: string): TrainingJourneyStepId {
  if (pathname.includes('/workout-assignments')) return 'assign'
  if (pathname.includes('/workout-monitoring')) return 'monitor'
  if (pathname.includes('/workouts-to-review') || pathname.includes('/member-workouts')) return 'review'
  return 'plan'
}
