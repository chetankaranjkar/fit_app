import type { PlanStretchWriteDto } from '../../types/stretch'
import type { PlanWarmupWriteDto } from '../../types/warmup'
import type { ProgramExerciseWriteDto, TemplateMode } from '../../types/workoutPlan'

export type WizardStep = 1 | 2 | 3

export const DURATION_OPTIONS = [30, 60, 90, 180, 365] as const
export const FOCUS_AREAS = [
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Push',
  'Pull',
  'Upper Body',
  'Lower Body',
  'Cardio',
  'Full Body',
  'Rest Day',
] as const

export type FocusArea = (typeof FOCUS_AREAS)[number]

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export interface WizardExerciseLine extends ProgramExerciseWriteDto {
  clientKey: string
  exerciseName: string
}

export interface WizardDayDraft {
  dayNumber: number
  name: string
  focusArea: string
  isRestDay: boolean
  orderIndex: number
  durationMinutes?: number
  exercises: WizardExerciseLine[]
  warmups: PlanWarmupWriteDto[]
  stretches: PlanStretchWriteDto[]
}

export interface WizardWeekDraft {
  weekNumber: number
  name: string
  days: WizardDayDraft[]
}

export interface WizardBasicInfo {
  name: string
  description: string
  goal: string
  difficultyLevel: string
  durationDays: number
  workoutsPerWeek: number
  workoutType: 'Strength' | 'Cardio' | 'Warmup' | 'ShortHIIT' | 'LongHIIT'
  templateMode: TemplateMode
  templateWeekCount: number
  workoutCategoryId: number
  useDefaultWarmups: boolean
  useDefaultStretches: boolean
  isPublic: boolean
}

export interface WizardPlanSummary {
  totalWeeks: number
  totalExercises: number
  totalWarmups: number
  totalStretches: number
  estimatedMinutes: number
}
