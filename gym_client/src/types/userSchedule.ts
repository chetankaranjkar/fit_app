export type ScheduleType =
  | 'OneMusclePerDay'
  | 'TwoMusclesPerDay'
  | 'ThreeMusclesPerDay'
  | 'FullBody'
  | 'Custom'

export interface UserScheduleDto {
  id: number
  userId: number
  userName: string
  trainerId?: number | null
  trainerName?: string | null
  workoutPlanId: number
  workoutPlanName: string
  scheduleType: ScheduleType
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
  assignedAt: string
  lastUpdatedAt?: string | null
}

export interface CreateUserScheduleDto {
  userId: number
  trainerId?: number | null
  workoutPlanId: number
  scheduleType: ScheduleType
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface AssignWorkoutPlanDto {
  userId: number
  trainerId?: number | null
  workoutPlanId: number
  scheduleType: ScheduleType
  dayOfWeek: number
  startTime: string
  endTime: string
  deactivateExistingAssignments?: boolean
}
