import { Router } from 'express'
import { ZodError } from 'zod'
import { WorkoutService } from './workout.service.js'
import {
  reorderWorkoutExercisesSchema,
  updateWorkoutExerciseSchema,
  upsertWorkoutSchema,
  workoutExerciseSchema,
  workoutListQuerySchema,
} from './workout.validators.js'

export function workoutController() {
  const router = Router()
  const service = new WorkoutService()

  router.get('/workouts', async (req, res) => {
    try {
      const query = workoutListQuerySchema.parse(req.query)
      const data = await service.list(query)
      res.json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Invalid query', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to fetch workouts' })
    }
  })

  router.post('/workouts', async (req, res) => {
    try {
      const body = upsertWorkoutSchema.parse(req.body)
      const data = await service.create(body)
      res.status(201).json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to create workout' })
    }
  })

  router.get('/workouts/:id', async (req, res) => {
    const data = await service.getById(req.params.id)
    if (!data) {
      res.status(404).json({ success: false, message: 'Workout not found' })
      return
    }
    res.json({ success: true, data })
  })

  router.put('/workouts/:id', async (req, res) => {
    try {
      const body = upsertWorkoutSchema.parse(req.body)
      const data = await service.update(req.params.id, body)
      if (!data) {
        res.status(404).json({ success: false, message: 'Workout not found' })
        return
      }
      res.json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to update workout' })
    }
  })

  router.delete('/workouts/:id', async (req, res) => {
    const ok = await service.delete(req.params.id)
    if (!ok) {
      res.status(404).json({ success: false, message: 'Workout not found' })
      return
    }
    res.json({ success: true, message: 'Workout deleted' })
  })

  router.post('/workouts/:id/exercises', async (req, res) => {
    try {
      const body = workoutExerciseSchema.parse(req.body)
      const data = await service.addExercise(req.params.id, body)
      res.status(201).json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to add workout exercise' })
    }
  })

  router.put('/workout-exercises/:id', async (req, res) => {
    try {
      const body = updateWorkoutExerciseSchema.parse(req.body)
      const data = await service.updateExercise(req.params.id, body)
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
      res.status(500).json({ success: false, message: 'Failed to update workout exercise' })
    }
  })

  router.delete('/workout-exercises/:id', async (req, res) => {
    const data = await service.removeExercise(req.params.id)
    if (!data) {
      res.status(404).json({ success: false, message: 'Workout exercise not found' })
      return
    }
    res.json({ success: true, data })
  })

  router.patch('/workouts/:id/reorder-exercises', async (req, res) => {
    try {
      const body = reorderWorkoutExercisesSchema.parse(req.body)
      const data = await service.reorderWorkoutExercises(req.params.id, body.items)
      res.json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to reorder exercises' })
    }
  })

  return router
}
