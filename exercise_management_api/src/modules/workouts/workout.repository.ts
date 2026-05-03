import { randomUUID } from 'node:crypto'
import { getDbPool } from '../../config/db.js'
import type {
  UpdateWorkoutExerciseInput,
  UpsertWorkoutInput,
  WorkoutExerciseInput,
  WorkoutListQuery,
} from './workout.types.js'

export class WorkoutRepository {
  async list(query: WorkoutListQuery) {
    const pool = await getDbPool()
    const request = pool.request()
    request.input('offset', (query.page - 1) * query.pageSize)
    request.input('pageSize', query.pageSize)
    request.input('search', query.search ? `%${query.search}%` : null)
    const result = await request.query(`
      SELECT
        w.Id AS id, w.Name AS name, w.Description AS description, w.Goal AS goal,
        w.Difficulty AS difficulty, w.Duration AS duration, w.IsTemplate AS isTemplate,
        w.CreatedAt AS createdAt, w.UpdatedAt AS updatedAt,
        COUNT(*) OVER() AS totalCount
      FROM Workouts w
      WHERE (@search IS NULL OR w.Name LIKE @search OR w.Goal LIKE @search)
      ORDER BY w.CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `)
    const rows = result.recordset ?? []
    const totalCount = Number(rows[0]?.totalCount ?? 0)
    return { items: rows, totalCount }
  }

  async findById(id: string) {
    const pool = await getDbPool()
    const workoutResult = await pool.request().input('id', id).query(`
      SELECT Id AS id, Name AS name, Description AS description, Goal AS goal, Difficulty AS difficulty,
             Duration AS duration, IsTemplate AS isTemplate, CreatedAt AS createdAt, UpdatedAt AS updatedAt
      FROM Workouts WHERE Id = @id
    `)
    const workout = workoutResult.recordset?.[0]
    if (!workout) return null

    const daysResult = await pool.request().input('id', id).query(`
      SELECT Id AS id, WorkoutId AS workoutId, DayName AS dayName, OrderIndex AS orderIndex
      FROM WorkoutDays WHERE WorkoutId = @id ORDER BY OrderIndex ASC
    `)

    const exercisesResult = await pool.request().input('id', id).query(`
      SELECT
        we.Id AS id, we.WorkoutId AS workoutId, we.WorkoutDayId AS workoutDayId, we.ExerciseId AS exerciseId,
        we.OrderIndex AS orderIndex, we.Sets AS sets, we.Reps AS reps, we.Weight AS weight,
        we.Duration AS duration, we.RestTime AS restTime, we.Notes AS notes, we.SupersetGroup AS supersetGroup,
        ex.Name AS exerciseName, ex.Category AS category, ex.MuscleGroupPrimary AS muscleGroupPrimary,
        ex.Difficulty AS difficulty, ex.Description AS description, media.ImageUrl AS imageUrl, media.VideoUrl AS videoUrl
      FROM WorkoutExercises we
      LEFT JOIN Exercises ex ON ex.Id = we.ExerciseId
      LEFT JOIN ExerciseMedia media ON media.ExerciseId = ex.Id
      WHERE we.WorkoutId = @id
      ORDER BY we.OrderIndex ASC
    `)

    return {
      ...workout,
      days: daysResult.recordset ?? [],
      exercises: exercisesResult.recordset ?? [],
    }
  }

  async create(input: UpsertWorkoutInput) {
    const pool = await getDbPool()
    const id = randomUUID()
    await pool
      .request()
      .input('id', id)
      .input('name', input.name)
      .input('description', input.description ?? null)
      .input('goal', input.goal ?? null)
      .input('difficulty', input.difficulty ?? null)
      .input('duration', input.duration ?? null)
      .input('isTemplate', input.isTemplate ?? false)
      .query(`
        INSERT INTO Workouts(Id, Name, Description, Goal, Difficulty, Duration, IsTemplate, CreatedAt)
        VALUES(@id, @name, @description, @goal, @difficulty, @duration, @isTemplate, GETDATE())
      `)

    if (input.days?.length) {
      for (const day of input.days) {
        await pool
          .request()
          .input('id', randomUUID())
          .input('workoutId', id)
          .input('dayName', day.dayName)
          .input('orderIndex', day.orderIndex)
          .query(
            'INSERT INTO WorkoutDays(Id, WorkoutId, DayName, OrderIndex, CreatedAt) VALUES(@id, @workoutId, @dayName, @orderIndex, GETDATE())',
          )
      }
    }
    return this.findById(id)
  }

  async update(id: string, input: UpsertWorkoutInput) {
    const pool = await getDbPool()
    await pool
      .request()
      .input('id', id)
      .input('name', input.name)
      .input('description', input.description ?? null)
      .input('goal', input.goal ?? null)
      .input('difficulty', input.difficulty ?? null)
      .input('duration', input.duration ?? null)
      .input('isTemplate', input.isTemplate ?? false)
      .query(`
        UPDATE Workouts
        SET Name=@name, Description=@description, Goal=@goal, Difficulty=@difficulty, Duration=@duration,
            IsTemplate=@isTemplate, UpdatedAt=GETDATE()
        WHERE Id=@id
      `)

    if (input.days) {
      await pool.request().input('id', id).query('DELETE FROM WorkoutDays WHERE WorkoutId=@id')
      for (const day of input.days) {
        await pool
          .request()
          .input('id', randomUUID())
          .input('workoutId', id)
          .input('dayName', day.dayName)
          .input('orderIndex', day.orderIndex)
          .query(
            'INSERT INTO WorkoutDays(Id, WorkoutId, DayName, OrderIndex, CreatedAt) VALUES(@id, @workoutId, @dayName, @orderIndex, GETDATE())',
          )
      }
    }
    return this.findById(id)
  }

  async delete(id: string) {
    const pool = await getDbPool()
    const result = await pool.request().input('id', id).query('DELETE FROM Workouts WHERE Id=@id')
    return result.rowsAffected[0] > 0
  }

  async addExercise(workoutId: string, input: WorkoutExerciseInput) {
    const pool = await getDbPool()
    const id = randomUUID()
    await pool
      .request()
      .input('id', id)
      .input('workoutId', workoutId)
      .input('workoutDayId', input.workoutDayId ?? null)
      .input('exerciseId', input.exerciseId)
      .input('orderIndex', input.orderIndex)
      .input('sets', input.sets ?? null)
      .input('reps', input.reps ?? null)
      .input('weight', input.weight ?? null)
      .input('duration', input.duration ?? null)
      .input('restTime', input.restTime ?? null)
      .input('notes', input.notes ?? null)
      .input('supersetGroup', input.supersetGroup ?? null)
      .query(`
        INSERT INTO WorkoutExercises(Id, WorkoutId, WorkoutDayId, ExerciseId, OrderIndex, Sets, Reps, Weight, Duration, RestTime, Notes, SupersetGroup, CreatedAt)
        VALUES(@id, @workoutId, @workoutDayId, @exerciseId, @orderIndex, @sets, @reps, @weight, @duration, @restTime, @notes, @supersetGroup, GETDATE())
      `)
    return this.findById(workoutId)
  }

  async updateExercise(id: string, input: UpdateWorkoutExerciseInput) {
    const pool = await getDbPool()
    const current = await pool.request().input('id', id).query('SELECT WorkoutId AS workoutId FROM WorkoutExercises WHERE Id=@id')
    const workoutId = current.recordset?.[0]?.workoutId as string | undefined
    if (!workoutId) return null
    await pool
      .request()
      .input('id', id)
      .input('workoutDayId', input.workoutDayId ?? null)
      .input('orderIndex', input.orderIndex ?? null)
      .input('sets', input.sets ?? null)
      .input('reps', input.reps ?? null)
      .input('weight', input.weight ?? null)
      .input('duration', input.duration ?? null)
      .input('restTime', input.restTime ?? null)
      .input('notes', input.notes ?? null)
      .input('supersetGroup', input.supersetGroup ?? null)
      .query(`
        UPDATE WorkoutExercises SET
          WorkoutDayId = COALESCE(@workoutDayId, WorkoutDayId),
          OrderIndex = COALESCE(@orderIndex, OrderIndex),
          Sets = COALESCE(@sets, Sets),
          Reps = COALESCE(@reps, Reps),
          Weight = COALESCE(@weight, Weight),
          Duration = COALESCE(@duration, Duration),
          RestTime = COALESCE(@restTime, RestTime),
          Notes = COALESCE(@notes, Notes),
          SupersetGroup = COALESCE(@supersetGroup, SupersetGroup),
          UpdatedAt = GETDATE()
        WHERE Id=@id
      `)
    return this.findById(workoutId)
  }

  async removeExercise(id: string) {
    const pool = await getDbPool()
    const current = await pool.request().input('id', id).query('SELECT WorkoutId AS workoutId FROM WorkoutExercises WHERE Id=@id')
    const workoutId = current.recordset?.[0]?.workoutId as string | undefined
    if (!workoutId) return null
    await pool.request().input('id', id).query('DELETE FROM WorkoutExercises WHERE Id=@id')
    return this.findById(workoutId)
  }

  async reorderWorkoutExercises(workoutId: string, items: Array<{ id: string; orderIndex: number; workoutDayId?: string | null }>) {
    const pool = await getDbPool()
    for (const item of items) {
      await pool
        .request()
        .input('id', item.id)
        .input('workoutId', workoutId)
        .input('orderIndex', item.orderIndex)
        .input('workoutDayId', item.workoutDayId ?? null)
        .query(`
          UPDATE WorkoutExercises
          SET OrderIndex=@orderIndex, WorkoutDayId=@workoutDayId, UpdatedAt=GETDATE()
          WHERE Id=@id AND WorkoutId=@workoutId
        `)
    }
    return this.findById(workoutId)
  }
}
