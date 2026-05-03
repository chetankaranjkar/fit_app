import { z } from 'zod'

export const workoutListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
})

export const workoutDaySchema = z.object({
  id: z.string().uuid().optional(),
  dayName: z.string().trim().min(1).max(50),
  orderIndex: z.number().int().min(0),
})

export const upsertWorkoutSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  goal: z.string().trim().max(50).optional(),
  difficulty: z.string().trim().max(50).optional(),
  duration: z.number().int().min(1).max(500).optional(),
  isTemplate: z.boolean().optional(),
  days: z.array(workoutDaySchema).optional(),
})

export const workoutExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  workoutDayId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().int().min(0),
  sets: z.number().int().min(1).max(30).optional(),
  reps: z.number().int().min(1).max(300).optional(),
  weight: z.number().min(0).max(1000).optional(),
  duration: z.number().int().min(0).max(7200).optional(),
  restTime: z.number().int().min(0).max(7200).optional(),
  notes: z.string().trim().max(1000).optional(),
  supersetGroup: z.string().trim().max(60).optional(),
})

export const updateWorkoutExerciseSchema = workoutExerciseSchema.partial()

export const reorderWorkoutExercisesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(0),
      workoutDayId: z.string().uuid().nullable().optional(),
    }),
  ),
})
