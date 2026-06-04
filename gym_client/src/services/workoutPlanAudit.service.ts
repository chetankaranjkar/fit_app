import { api } from '../lib/api'

export type WorkoutPlanAuditAction =
  | 'Created'
  | 'Updated'
  | 'ExerciseAdded'
  | 'ExerciseUpdated'
  | 'ExerciseRemoved'
  | 'Deleted'

export interface WorkoutPlanAuditLog {
  id: number
  workoutPlanId?: number | null
  workoutPlanName: string
  assignedToUserId?: number | null
  assignedToUserName?: string | null
  action: WorkoutPlanAuditAction
  changeDetails?: string | null
  snapshotJson?: string | null
  performedByUserId: number
  performedByUserName: string
  performedDate: string
}

function normalizeLog(raw: Record<string, unknown>): WorkoutPlanAuditLog {
  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    workoutPlanId: (raw.workoutPlanId ?? raw.WorkoutPlanId) as number | null | undefined,
    workoutPlanName: String(raw.workoutPlanName ?? raw.WorkoutPlanName ?? ''),
    assignedToUserId: (raw.assignedToUserId ?? raw.AssignedToUserId) as number | null | undefined,
    assignedToUserName: (raw.assignedToUserName ?? raw.AssignedToUserName) as string | null | undefined,
    action: String(raw.action ?? raw.Action ?? '') as WorkoutPlanAuditAction,
    changeDetails: (raw.changeDetails ?? raw.ChangeDetails) as string | null | undefined,
    snapshotJson: (raw.snapshotJson ?? raw.SnapshotJson) as string | null | undefined,
    performedByUserId: Number(raw.performedByUserId ?? raw.PerformedByUserId ?? 0),
    performedByUserName: String(raw.performedByUserName ?? raw.PerformedByUserName ?? ''),
    performedDate: String(raw.performedDate ?? raw.PerformedDate ?? ''),
  }
}

export const workoutPlanAuditService = {
  list: async (params?: {
    memberUserId?: number
    fromUtc?: string
    toUtc?: string
    action?: WorkoutPlanAuditAction
    take?: number
  }): Promise<WorkoutPlanAuditLog[]> => {
    const search = new URLSearchParams()
    if (params?.memberUserId) search.set('memberUserId', String(params.memberUserId))
    if (params?.fromUtc) search.set('fromUtc', params.fromUtc)
    if (params?.toUtc) search.set('toUtc', params.toUtc)
    if (params?.action) search.set('action', params.action)
    if (params?.take) search.set('take', String(params.take))
    const qs = search.toString()
    const { data } = await api.get<unknown[]>(`/workout-plan-audit${qs ? `?${qs}` : ''}`)
    const list = Array.isArray(data) ? data : []
    return list.map((row) => normalizeLog(row as Record<string, unknown>))
  },
}

export const workoutPlanAuditActionLabels: Record<WorkoutPlanAuditAction, string> = {
  Created: 'Workout plan created',
  Updated: 'Workout plan updated',
  ExerciseAdded: 'Exercise added',
  ExerciseUpdated: 'Exercise updated',
  ExerciseRemoved: 'Exercise removed',
  Deleted: 'Workout plan deleted',
}
