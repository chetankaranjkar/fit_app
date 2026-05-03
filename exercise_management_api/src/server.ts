import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { aiController } from './modules/ai/ai.controller.js'
import { exerciseController } from './modules/exercises/exercise.controller.js'
import { workoutPlanBuilderController } from './modules/workout-plans-builder/workoutPlanBuilder.controller.js'
import { workoutController } from './modules/workouts/workout.controller.js'

const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_, res) => {
  res.json({ ok: true })
})

app.use('/api/exercises', exerciseController())
app.use('/api', workoutController())
app.use('/api', workoutPlanBuilderController())
app.use('/api', aiController())

const port = Number(process.env.PORT ?? 4300)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`exercise-management-api running on http://localhost:${port}`)
})
