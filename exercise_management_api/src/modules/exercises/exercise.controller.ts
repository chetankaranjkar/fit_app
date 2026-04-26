import { Router } from 'express'
import { ZodError } from 'zod'
import { ExerciseService } from './exercise.service.js'
import { listExercisesQuerySchema, upsertExerciseSchema } from './exercise.validators.js'

export function exerciseController() {
  const router = Router()
  const service = new ExerciseService()

  router.get('/', async (req, res) => {
    try {
      const query = listExercisesQuerySchema.parse(req.query)
      const data = await service.getList(query)
      res.json({ success: true, data })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Invalid query', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to fetch exercises' })
    }
  })

  router.get('/:id', async (req, res) => {
    const item = await service.getById(req.params.id)
    if (!item) {
      res.status(404).json({ success: false, message: 'Exercise not found' })
      return
    }
    res.json({ success: true, data: item })
  })

  router.post('/', async (req, res) => {
    try {
      const body = upsertExerciseSchema.parse(req.body)
      const created = await service.create(body)
      res.status(201).json({ success: true, data: created })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to create exercise' })
    }
  })

  router.put('/:id', async (req, res) => {
    try {
      const body = upsertExerciseSchema.parse(req.body)
      const updated = await service.update(req.params.id, body)
      res.json({ success: true, data: updated })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      res.status(500).json({ success: false, message: 'Failed to update exercise' })
    }
  })

  router.delete('/:id', async (req, res) => {
    const ok = await service.delete(req.params.id)
    if (!ok) {
      res.status(404).json({ success: false, message: 'Exercise not found' })
      return
    }
    res.json({ success: true, message: 'Exercise deleted' })
  })

  return router
}
