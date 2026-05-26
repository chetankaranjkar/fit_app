export type WorkoutSessionExercise = {
  id: number
  exerciseId: number
  exerciseName: string
  setNumber: number
  targetReps: number
  actualReps?: number | null
  targetWeight?: number | null
  actualWeight?: number | null
  durationSeconds?: number | null
  restSeconds?: number | null
  isCompleted: boolean
  notes?: string | null
  setVolume?: number | null
}

export type WorkoutSessionGroup = {
  exerciseId: number
  exerciseName: string
  sets: WorkoutSessionExercise[]
}

export type ActiveWorkoutActiveResponse = {
  session: ActiveWorkoutSession
  completionPercent: number
  lastSyncedAt?: string | null
  pendingOfflineChanges: boolean
  serverTimeUtc: string
}

export type MemberWorkoutTimeline = {
  memberId: number
  memberName: string
  sessions: MemberWorkoutSummary[]
  adherencePercent: number
  completedThisWeek: number
}

export type WorkoutSessionDetail = {
  session: ActiveWorkoutSession
  durationMinutes: number
  completedExercises: number
  totalVolume: number
  adherencePercent: number
}

export type WorkoutAdminMonitoring = {
  activeLiveSessions: number
  completedToday: number
  activeSessions: MemberWorkoutSummary[]
  recentCompleted: MemberWorkoutSummary[]
}

export type ActiveWorkoutSession = {
  sessionId: number
  memberId: number
  workoutPlanId?: number | null
  planName?: string | null
  status: string
  workoutDate?: string | null
  startTimeUtc?: string | null
  completionPercent: number
  completedSets: number
  totalSets: number
  totalVolume: number
  exercises: WorkoutSessionGroup[]
}

export type WorkoutExerciseHistoryEntry = {
  sessionId: number
  workoutDateUtc: string
  setNumber: number
  weight?: number | null
  reps?: number | null
  volume: number
  isPersonalRecord: boolean
  isImprovement: boolean
}

export type WorkoutExerciseHistory = {
  exerciseId: number
  exerciseName: string
  bestWeight?: number | null
  bestReps?: number | null
  bestVolume?: number | null
  entries: WorkoutExerciseHistoryEntry[]
}

export type WorkoutDashboard = {
  memberId: number
  currentStreakDays: number
  totalWorkouts: number
  workoutsThisWeek: number
  lastWorkoutDateUtc?: string | null
  averageCompletionPercent: number
  activeSession?: ActiveWorkoutSession | null
}

export type MemberWorkoutSummary = {
  sessionId: number
  memberId: number
  memberName: string
  planName?: string | null
  sessionDateUtc: string
  status: string
  completionPercent?: number | null
  totalVolume?: number | null
}
