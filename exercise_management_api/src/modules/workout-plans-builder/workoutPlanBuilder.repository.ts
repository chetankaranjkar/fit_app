import { getDbPool } from '../../config/db.js'
import type {
  AddWorkoutDayExerciseInput,
  AddWorkoutPlanDayInput,
  CreateWorkoutPlanInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutPlanDayInput,
} from './workoutPlanBuilder.types.js'

export class WorkoutPlanBuilderRepository {
  private static readonly DESCRIPTION_META_PREFIX = '[WPMETA]'

  private encodeDescription(goal?: string | null) {
    const normalizedGoal = goal?.trim()
    if (!normalizedGoal) return null
    return `${WorkoutPlanBuilderRepository.DESCRIPTION_META_PREFIX}${JSON.stringify({ goal: normalizedGoal })}`
  }

  private decodeDescription(description?: string | null) {
    if (!description) {
      return { goal: null as string | null, description: null as string | null }
    }

    const trimmed = description.trim()
    if (!trimmed.startsWith(WorkoutPlanBuilderRepository.DESCRIPTION_META_PREFIX)) {
      return { goal: trimmed, description: trimmed }
    }

    const payload = trimmed.slice(WorkoutPlanBuilderRepository.DESCRIPTION_META_PREFIX.length)
    try {
      const parsed = JSON.parse(payload) as { goal?: unknown }
      const goal = typeof parsed.goal === 'string' ? parsed.goal.trim() : ''
      return { goal: goal || null, description: trimmed }
    } catch {
      return { goal: null, description: trimmed }
    }
  }

  private inferWorkoutType(goal?: string | null) {
    const value = (goal ?? '').toLowerCase()
    if (value.includes('hiit')) return 1
    if (value.includes('cardio') || value.includes('fat')) return 4
    if (value.includes('warm')) return 0
    return 3
  }

  async createWorkoutPlan(input: CreateWorkoutPlanInput) {
    const pool = await getDbPool()
    const workoutType = this.inferWorkoutType(input.goal)
    await pool
      .request()
      .input('name', input.name)
      .input('description', this.encodeDescription(input.goal))
      .input('workoutType', workoutType)
      .input('duration', input.duration ?? 30)
      .input('difficulty', input.difficulty ?? null)
      .input('isActive', true)
      .input('isPublic', false)
      .input('isDeleted', false)
      .query(`
        INSERT INTO WorkoutPlans (Name, Description, WorkoutType, Duration, DifficultyLevel, IsActive, IsPublic, CreatedDate, IsDeleted)
        VALUES (@name, @description, @workoutType, @duration, @difficulty, @isActive, @isPublic, GETDATE(), @isDeleted)
      `)
    const inserted = await pool.request().query('SELECT TOP 1 Id AS id FROM WorkoutPlans ORDER BY Id DESC')
    const id = inserted.recordset?.[0]?.id as number | undefined
    if (!id) return null
    return this.getWorkoutPlanById(id)
  }

  async getWorkoutPlanById(id: number) {
    const pool = await getDbPool()
    const planResult = await pool.request().input('id', id).query(`
      SELECT Id AS id, Name AS name, Description AS description, WorkoutType AS workoutType, Duration AS duration, DifficultyLevel AS difficulty, CreatedDate AS createdAt
      FROM WorkoutPlans WHERE Id = @id
    `)
    const plan = planResult.recordset?.[0]
    if (!plan) return null

    const daysResult = await pool.request().input('id', id).query(`
      SELECT Id AS id, WorkoutPlanId AS workoutPlanId, WorkoutPlanWeekId AS workoutPlanWeekId, DayNumber AS dayNumber, Name AS name, IsRestDay AS isRestDay, OrderIndex AS orderIndex
      FROM WorkoutPlanDays WHERE WorkoutPlanId = @id ORDER BY OrderIndex ASC
    `)

    const exercisesResult = await pool.request().input('id', id).query(`
      SELECT
        wpe.Id AS id, wpe.WorkoutPlanId AS workoutPlanId, wpe.WorkoutPlanDayId AS workoutPlanDayId,
        wpe.ExerciseId AS exerciseId, wpe.[Order] AS orderIndex, wpe.Sets AS sets, wpe.Reps AS reps, wpe.RestBetweenSets AS restTime,
        e.Name AS exerciseName
      FROM WorkoutPlanExercises wpe
      LEFT JOIN Exercises e ON e.Id = wpe.ExerciseId
      WHERE wpe.WorkoutPlanId = @id
      ORDER BY wpe.[Order] ASC
    `)

    const normalizedDescription = this.decodeDescription(plan.description as string | null | undefined)
    return {
      ...plan,
      description: normalizedDescription.description,
      goal: normalizedDescription.goal,
      days: daysResult.recordset ?? [],
      exercises: exercisesResult.recordset ?? [],
    }
  }

  private async ensureWeekOne(workoutPlanId: number): Promise<number> {
    const pool = await getDbPool()
    const existing = await pool.request().input('pid', workoutPlanId).query(`
      SELECT TOP 1 Id AS id FROM WorkoutPlanWeeks WHERE WorkoutPlanId = @pid AND WeekNumber = 1 AND IsDeleted = 0
    `)
    const found = existing.recordset?.[0]?.id as number | undefined
    if (found) return found
    await pool
      .request()
      .input('pid', workoutPlanId)
      .query(`
        INSERT INTO WorkoutPlanWeeks (WorkoutPlanId, WeekNumber, Name, CreatedDate, IsDeleted)
        VALUES (@pid, 1, N'Week 1', GETDATE(), 0)
      `)
    const inserted = await pool.request().input('pid', workoutPlanId).query(`
      SELECT TOP 1 Id AS id FROM WorkoutPlanWeeks WHERE WorkoutPlanId = @pid AND WeekNumber = 1 ORDER BY Id DESC
    `)
    return inserted.recordset?.[0]?.id as number
  }

  async addDay(workoutPlanId: number, input: AddWorkoutPlanDayInput) {
    const pool = await getDbPool()
    const weekId = await this.ensureWeekOne(workoutPlanId)
    await pool
      .request()
      .input('workoutPlanId', workoutPlanId)
      .input('workoutPlanWeekId', weekId)
      .input('dayNumber', input.dayNumber)
      .input('name', input.name)
      .input('isRestDay', input.isRestDay ?? false)
      .input('orderIndex', input.orderIndex)
      .query(`
        INSERT INTO WorkoutPlanDays (WorkoutPlanId, WorkoutPlanWeekId, DayNumber, Name, IsRestDay, OrderIndex, CreatedDate, IsDeleted)
        VALUES (@workoutPlanId, @workoutPlanWeekId, @dayNumber, @name, @isRestDay, @orderIndex, GETDATE(), 0)
      `)
    return this.getWorkoutPlanById(workoutPlanId)
  }

  async updateDay(dayId: number, input: UpdateWorkoutPlanDayInput) {
    const pool = await getDbPool()
    const current = await pool.request().input('id', dayId).query(`
      SELECT WorkoutPlanId AS workoutPlanId FROM WorkoutPlanDays WHERE Id = @id
    `)
    const workoutPlanId = current.recordset?.[0]?.workoutPlanId as number | undefined
    if (!workoutPlanId) return null
    await pool
      .request()
      .input('id', dayId)
      .input('name', input.name ?? null)
      .input('isRestDay', input.isRestDay ?? null)
      .input('orderIndex', input.orderIndex ?? null)
      .query(`
        UPDATE WorkoutPlanDays
        SET Name = COALESCE(@name, Name),
            IsRestDay = COALESCE(@isRestDay, IsRestDay),
            OrderIndex = COALESCE(@orderIndex, OrderIndex),
            UpdatedDate = GETDATE()
        WHERE Id = @id
      `)
    return this.getWorkoutPlanById(workoutPlanId)
  }

  async deleteDay(dayId: number) {
    const pool = await getDbPool()
    const current = await pool.request().input('id', dayId).query('SELECT WorkoutPlanId AS workoutPlanId FROM WorkoutPlanDays WHERE Id = @id')
    const workoutPlanId = current.recordset?.[0]?.workoutPlanId as number | undefined
    if (!workoutPlanId) return null
    await pool.request().input('id', dayId).query('DELETE FROM WorkoutPlanDays WHERE Id = @id')
    return this.getWorkoutPlanById(workoutPlanId)
  }

  async addExercise(dayId: number, input: AddWorkoutDayExerciseInput) {
    const pool = await getDbPool()
    const day = await pool.request().input('id', dayId).query('SELECT WorkoutPlanId AS workoutPlanId FROM WorkoutPlanDays WHERE Id = @id')
    const workoutPlanId = day.recordset?.[0]?.workoutPlanId as number | undefined
    if (!workoutPlanId) return null
    await pool
      .request()
      .input('workoutPlanId', workoutPlanId)
      .input('workoutPlanDayId', dayId)
      .input('exerciseId', input.exerciseId)
      .input('orderIndex', input.orderIndex)
      .input('sets', input.sets ?? null)
      .input('reps', input.reps ?? null)
      .input('restTime', input.restTime ?? null)
      .query(`
        INSERT INTO WorkoutPlanExercises (WorkoutPlanId, WorkoutPlanDayId, ExerciseId, [Order], Sets, Reps, RestBetweenSets, CreatedDate, IsDeleted)
        VALUES (@workoutPlanId, @workoutPlanDayId, @exerciseId, @orderIndex, @sets, @reps, @restTime, GETDATE(), 0)
      `)
    return this.getWorkoutPlanById(workoutPlanId)
  }

  async updateExercise(exerciseRowId: number, input: UpdateWorkoutExerciseInput) {
    const pool = await getDbPool()
    const current = await pool.request().input('id', exerciseRowId).query(`
      SELECT WorkoutPlanId AS workoutPlanId FROM WorkoutPlanExercises WHERE Id = @id
    `)
    const workoutPlanId = current.recordset?.[0]?.workoutPlanId as number | undefined
    if (!workoutPlanId) return null
    await pool
      .request()
      .input('id', exerciseRowId)
      .input('orderIndex', input.orderIndex ?? null)
      .input('sets', input.sets ?? null)
      .input('reps', input.reps ?? null)
      .input('restTime', input.restTime ?? null)
      .query(`
        UPDATE WorkoutPlanExercises
        SET [Order] = COALESCE(@orderIndex, [Order]),
            Sets = COALESCE(@sets, Sets),
            Reps = COALESCE(@reps, Reps),
            RestBetweenSets = COALESCE(@restTime, RestBetweenSets),
            UpdatedDate = GETDATE()
        WHERE Id = @id
      `)
    return this.getWorkoutPlanById(workoutPlanId)
  }

  async deleteExercise(exerciseRowId: number) {
    const pool = await getDbPool()
    const current = await pool.request().input('id', exerciseRowId).query(`
      SELECT WorkoutPlanId AS workoutPlanId FROM WorkoutPlanExercises WHERE Id = @id
    `)
    const workoutPlanId = current.recordset?.[0]?.workoutPlanId as number | undefined
    if (!workoutPlanId) return null
    await pool.request().input('id', exerciseRowId).query('DELETE FROM WorkoutPlanExercises WHERE Id = @id')
    return this.getWorkoutPlanById(workoutPlanId)
  }
}
