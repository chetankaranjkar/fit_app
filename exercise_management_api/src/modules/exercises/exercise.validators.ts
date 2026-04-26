import { z } from 'zod'

export const listExercisesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  equipment: z.string().optional(),
})

export const upsertExerciseSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  category: z.string().trim().optional(),
  muscleGroupPrimary: z.string().trim().optional(),
  difficulty: z.string().trim().optional(),
  description: z.string().trim().optional(),
  forceType: z.string().trim().optional(),
  mechanic: z.string().trim().optional(),
  equipment: z.array(z.string().trim()).optional(),
  isUnilateral: z.boolean().optional(),
  isTimeBased: z.boolean().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
})
