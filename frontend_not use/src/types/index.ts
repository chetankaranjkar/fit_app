export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth: string
  gender: string
  registrationDate: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  profilePictureUrl?: string
  preferredGymTime?: string
  isActive: boolean
}

export interface UserDetail {
  id: number
  userId: number
  height: number
  weight: number
  bmr: number
  bmi: number
  bodyFatPercentage?: number
  muscleMass?: number
  targetWeight?: number
  goalType?: string
  activityLevel?: string
  measurementDate: string
  notes?: string
}

export interface ExerciseStep {
  id?: number
  stepNumber: number
  description: string
  imageUrl?: string
}

export interface Exercise {
  id: number
  name: string
  description?: string
  steps: string // Kept for backward compatibility
  videoUrl?: string
  difficultyLevel: string
  equipmentRequired?: string
  bodyPartId: number
  bodyPartName: string
  exerciseSteps?: ExerciseStep[]
}

export interface BodyPart {
  id: number
  name: string
  description?: string
  imageUrl?: string
  exerciseCount: number
  cameraPositionJson?: string
}

export interface WorkoutPlan {
  id: number
  name: string
  description?: string
  workoutType: string
  duration: number
  difficultyLevel: string
  instructorId?: number
  instructorName?: string
  createdById?: number
  creatorType?: 'User' | 'Instructor'
  creatorName?: string
  isPublic: boolean
  isActive: boolean
  exercises: WorkoutPlanExercise[]
}

export interface WorkoutPlanExercise {
  id: number
  exerciseId: number
  exerciseName: string
  sets: number
  reps: number
  restBetweenSets: number
  order: number
  weight?: number
}

export interface UserSchedule {
  id: number
  userId: number
  userName: string
  instructorId?: number
  instructorName?: string
  workoutPlanId: number
  workoutPlanName: string
  scheduleType: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export interface Instructor {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string
  specialization?: string
  bio?: string
  profilePicture?: string
  hireDate: string
  isActive: boolean
}

export interface ProgressTracking {
  id: number
  userId: number
  userName: string
  trackDate: string
  weight: number
  bodyFatPercentage?: number
  muscleMass?: number
  notes?: string
  progressPictures?: string
  height?: number
  bmr?: number
  bmi?: number
}

export interface DashboardStatistics {
  totalUsers: number
  totalInstructors: number
  instructorsWithUserCount: InstructorUserCount[]
}

export interface InstructorUserCount {
  instructorId: number
  instructorName: string
  instructorEmail: string
  userCount: number
}

export interface BodyMetrics {
  id: number
  userId: number
  userName: string
  measurementDate: string
  weightKg: number
  bodyFatPct?: number
  muscleMassKg?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  bicepsCm?: number
  thighsCm?: number
  neckCm?: number
  shouldersCm?: number
  forearmsCm?: number
  calvesCm?: number
  heightCm?: number
  notes?: string
  progressPictureUrl?: string
}

export interface BodyMetricsLog {
  id: number
  bodyMetricsId: number
  userId: number
  userName: string
  measurementDate: string
  createdDate: string
  weightKg: number
  bodyFatPct?: number
  muscleMassKg?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  bicepsCm?: number
  thighsCm?: number
  neckCm?: number
  shouldersCm?: number
  forearmsCm?: number
  calvesCm?: number
  heightCm?: number
  notes?: string
  progressPictureUrl?: string
}

export interface AttendanceLog {
  id: number
  userId: number
  userName: string
  checkInTime: string
  checkOutTime?: string
  attendanceDate: string
  durationMinutes?: number
  notes?: string
  checkInMethod?: string
  checkOutMethod?: string
  isCheckedIn: boolean
}

