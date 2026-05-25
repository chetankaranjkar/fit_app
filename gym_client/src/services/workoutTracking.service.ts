import { api } from '../lib/api'
import type {
  ActiveWorkoutSession,
  MemberWorkoutSummary,
  WorkoutDashboard,
  WorkoutExerciseHistory,
  WorkoutSessionExercise,
} from '../types/workoutTracking'

const base = '/workout'

export const workoutTrackingService = {
  myMemberId: () => api.get<{ memberId: number }>(`${base}/my-member-id`),

  start: (body: { memberId: number; workoutPlanId: number; utcOffsetMinutes?: number }) =>
    api.post<ActiveWorkoutSession>(`${base}/start`, body),

  getActive: (memberId: number) => api.get<ActiveWorkoutSession>(`${base}/active/${memberId}`),

  logSet: (body: {
    workoutSessionExerciseId: number
    actualReps?: number
    actualWeight?: number
    durationSeconds?: number
    restSeconds?: number
    isCompleted: boolean
    notes?: string
  }) => api.post<WorkoutSessionExercise>(`${base}/log-set`, body),

  complete: (sessionId: number, caloriesBurned?: number) =>
    api.post<ActiveWorkoutSession>(`${base}/complete/${sessionId}`, null, {
      params: caloriesBurned != null ? { caloriesBurned } : undefined,
    }),

  exerciseHistory: (memberId: number, exerciseId: number, take = 50) =>
    api.get<WorkoutExerciseHistory>(`${base}/exercise-history/${memberId}/${exerciseId}`, {
      params: { take },
    }),

  dashboard: (memberId: number) => api.get<WorkoutDashboard>(`${base}/dashboard/${memberId}`),

  trainerMemberWorkouts: (take = 30) =>
    api.get<MemberWorkoutSummary[]>(`${base}/trainer/members`, { params: { take } }),
}
