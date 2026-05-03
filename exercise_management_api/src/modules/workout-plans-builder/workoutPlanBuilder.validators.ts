import { z } from 'zod'

export const createWorkoutPlanSchema = z.object({
  name: z.string().trim().min(2).max(150),
  goal: z.string().trim().max(60).optional(),
  duration: z.number().int().min(7).max(365).optional(),
  difficulty: z.string().trim().max(50).optional(),
})

export const addWorkoutPlanDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  name: z.string().trim().min(1).max(80),
  isRestDay: z.boolean().optional(),
  orderIndex: z.number().int().min(0),
})

export const updateWorkoutPlanDaySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isRestDay: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export const addWorkoutDayExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  orderIndex: z.number().int().min(0),
  sets: z.number().int().min(1).max(30).optional(),
  reps: z.number().int().min(1).max(300).optional(),
  restTime: z.number().int().min(0).max(7200).optional(),
})

export const updateWorkoutExerciseSchema = z.object({
  orderIndex: z.number().int().min(0).optional(),
  sets: z.number().int().min(1).max(30).optional(),
  reps: z.number().int().min(1).max(300).optional(),
  restTime: z.number().int().min(0).max(7200).optional(),
})
