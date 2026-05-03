import { Router } from 'express'
import { ZodError } from 'zod'
import { WorkoutPlanBuilderService } from './workoutPlanBuilder.service.js'
import {
  addWorkoutDayExerciseSchema,
  addWorkoutPlanDaySchema,
  createWorkoutPlanSchema,
  updateWorkoutExerciseSchema,
  updateWorkoutPlanDaySchema,
} from './workoutPlanBuilder.validators.js'

export function workoutPlanBuilderController() {
  const router = Router()
  const service = new WorkoutPlanBuilderService()

  router.post('/workout-plans', async (req, res) => {
    try {
      const body = createWorkoutPlanSchema.parse(req.body)
      const data = await service.createWorkoutPlan(body)
      res.status(201).json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to create workout plan' })
    }
  })

  router.get('/workout-plans/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'Invalid workout plan id' })
      return
    }
    const data = await service.getWorkoutPlanById(id)
    if (!data) {
      res.status(404).json({ success: false, message: 'Workout plan not found' })
      return
    }
    res.json({ success: true, data })
  })

  router.post('/workout-plans/:id/days', async (req, res) => {
    try {
      const planId = Number(req.params.id)
      if (!Number.isInteger(planId) || planId <= 0) {
        res.status(400).json({ success: false, message: 'Invalid workout plan id' })
        return
      }
      const body = addWorkoutPlanDaySchema.parse(req.body)
      const data = await service.addDay(planId, body)
      if (!data) {
        res.status(404).json({ success: false, message: 'Workout plan not found' })
        return
      }
      res.status(201).json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to add day' })
    }
  })

  router.put('/workout-days/:id', async (req, res) => {
    try {
      const dayId = Number(req.params.id)
      if (!Number.isInteger(dayId) || dayId <= 0) {
        res.status(400).json({ success: false, message: 'Invalid workout day id' })
        return
      }
      const body = updateWorkoutPlanDaySchema.parse(req.body)
      const data = await service.updateDay(dayId, body)
      if (!data) {
        res.status(404).json({ success: false, message: 'Workout day not found' })
        return
      }
      res.json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to update day' })
    }
  })

  router.delete('/workout-days/:id', async (req, res) => {
    const dayId = Number(req.params.id)
    if (!Number.isInteger(dayId) || dayId <= 0) {
      res.status(400).json({ success: false, message: 'Invalid workout day id' })
      return
    }
    const data = await service.deleteDay(dayId)
    if (!data) {
      res.status(404).json({ success: false, message: 'Workout day not found' })
      return
    }
    res.json({ success: true, data })
  })

  router.post('/workout-days/:dayId/exercises', async (req, res) => {
    try {
      const dayId = Number(req.params.dayId)
      if (!Number.isInteger(dayId) || dayId <= 0) {
        res.status(400).json({ success: false, message: 'Invalid workout day id' })
        return
      }
      const body = addWorkoutDayExerciseSchema.parse(req.body)
      const data = await service.addExercise(dayId, body)
      if (!data) {
        res.status(404).json({ success: false, message: 'Workout day not found' })
        return
      }
      res.status(201).json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to add exercise' })
    }
  })

  router.put('/workout-exercises/:id', async (req, res) => {
    try {
      const exerciseRowId = Number(req.params.id)
      if (!Number.isInteger(exerciseRowId) || exerciseRowId <= 0) {
        res.status(400).json({ success: false, message: 'Invalid workout exercise id' })
        return
      }
      const body = updateWorkoutExerciseSchema.parse(req.body)
      const data = await service.updateExercise(exerciseRowId, body)
      if (!data) {
        res.status(404).json({ success: false, message: 'Workout exercise not found' })
        return
      }
      res.json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to update exercise' })
    }
  })

  router.delete('/workout-exercises/:id', async (req, res) => {
    const exerciseRowId = Number(req.params.id)
    if (!Number.isInteger(exerciseRowId) || exerciseRowId <= 0) {
      res.status(400).json({ success: false, message: 'Invalid workout exercise id' })
      return
    }
    const data = await service.deleteExercise(exerciseRowId)
    if (!data) {
      res.status(404).json({ success: false, message: 'Workout exercise not found' })
      return
    }
    res.json({ success: true, data })
  })

  return router
}
