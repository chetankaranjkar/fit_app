import sql from 'mssql'
import { getDbPool } from '../../config/db.js'
import type { ExerciseListQuery, UpsertExerciseInput } from './exercise.types.js'

function toEquipmentCsv(equipment?: string[]) {
  return equipment && equipment.length > 0 ? equipment.join(', ') : null
}

export class ExerciseRepository {
  async list(query: ExerciseListQuery) {
    const pool = await getDbPool()
    const request = pool.request()
    request.input('search', sql.NVarChar, query.search?.trim() || null)
    request.input('category', sql.NVarChar, query.category || null)
    request.input('difficulty', sql.NVarChar, query.difficulty || null)
    request.input('equipment', sql.NVarChar, query.equipment || null)
    request.input('offset', sql.Int, (query.page - 1) * query.pageSize)
    request.input('pageSize', sql.Int, query.pageSize)
    const result = await request.query(`
      WITH FilteredExercises AS (
        SELECT 
          e.Id, e.Name, e.Slug, e.Category, e.MuscleGroupPrimary, e.Difficulty, e.Description, e.CreatedAt, e.UpdatedAt,
          d.ForceType, d.Mechanic, d.Equipment, d.IsUnilateral, d.IsTimeBased,
          m.ImageUrl, m.VideoUrl
        FROM Exercises e
        LEFT JOIN ExerciseDetails d ON d.ExerciseId = e.Id
        LEFT JOIN ExerciseMedia m ON m.ExerciseId = e.Id
        WHERE (@search IS NULL OR e.Name LIKE '%' + @search + '%' OR e.MuscleGroupPrimary LIKE '%' + @search + '%')
          AND (@category IS NULL OR e.Category = @category)
          AND (@difficulty IS NULL OR e.Difficulty = @difficulty)
          AND (@equipment IS NULL OR d.Equipment LIKE '%' + @equipment + '%')
      )
      SELECT * FROM FilteredExercises
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;

      SELECT COUNT(1) AS totalCount
      FROM Exercises e
      LEFT JOIN ExerciseDetails d ON d.ExerciseId = e.Id
      WHERE (@search IS NULL OR e.Name LIKE '%' + @search + '%' OR e.MuscleGroupPrimary LIKE '%' + @search + '%')
        AND (@category IS NULL OR e.Category = @category)
        AND (@difficulty IS NULL OR e.Difficulty = @difficulty)
        AND (@equipment IS NULL OR d.Equipment LIKE '%' + @equipment + '%');
    `)

    const recordsets = result.recordsets as Array<Array<{ totalCount?: number }>>
    const items = (recordsets[0] ?? []) as unknown[]
    const totalCount = recordsets[1]?.[0]?.totalCount ?? 0
    return { items, totalCount }
  }

  async findById(id: string) {
    const pool = await getDbPool()
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          e.Id, e.Name, e.Slug, e.Category, e.MuscleGroupPrimary, e.Difficulty, e.Description, e.CreatedAt, e.UpdatedAt,
          d.ForceType, d.Mechanic, d.Equipment, d.IsUnilateral, d.IsTimeBased,
          m.ImageUrl, m.VideoUrl
        FROM Exercises e
        LEFT JOIN ExerciseDetails d ON d.ExerciseId = e.Id
        LEFT JOIN ExerciseMedia m ON m.ExerciseId = e.Id
        WHERE e.Id = @id
      `)
    return result.recordset[0] ?? null
  }

  async create(input: UpsertExerciseInput & { slug: string }) {
    const pool = await getDbPool()
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      const r1 = await new sql.Request(tx)
        .input('name', sql.NVarChar, input.name)
        .input('slug', sql.NVarChar, input.slug)
        .input('category', sql.NVarChar, input.category || null)
        .input('muscleGroupPrimary', sql.NVarChar, input.muscleGroupPrimary || null)
        .input('difficulty', sql.NVarChar, input.difficulty || null)
        .input('description', sql.NVarChar, input.description || null)
        .query(`
          INSERT INTO Exercises (Name, Slug, Category, MuscleGroupPrimary, Difficulty, Description)
          OUTPUT inserted.Id
          VALUES (@name, @slug, @category, @muscleGroupPrimary, @difficulty, @description)
        `)
      const exerciseId = r1.recordset[0].Id as string

      await new sql.Request(tx)
        .input('exerciseId', sql.UniqueIdentifier, exerciseId)
        .input('forceType', sql.NVarChar, input.forceType || null)
        .input('mechanic', sql.NVarChar, input.mechanic || null)
        .input('equipment', sql.NVarChar, toEquipmentCsv(input.equipment))
        .input('isUnilateral', sql.Bit, input.isUnilateral ?? false)
        .input('isTimeBased', sql.Bit, input.isTimeBased ?? false)
        .query(`
          INSERT INTO ExerciseDetails (ExerciseId, ForceType, Mechanic, Equipment, IsUnilateral, IsTimeBased)
          VALUES (@exerciseId, @forceType, @mechanic, @equipment, @isUnilateral, @isTimeBased)
        `)

      await new sql.Request(tx)
        .input('exerciseId', sql.UniqueIdentifier, exerciseId)
        .input('imageUrl', sql.NVarChar, input.imageUrl || null)
        .input('videoUrl', sql.NVarChar, input.videoUrl || null)
        .query(`
          INSERT INTO ExerciseMedia (ExerciseId, ImageUrl, VideoUrl)
          VALUES (@exerciseId, @imageUrl, @videoUrl)
        `)

      await tx.commit()
      return this.findById(exerciseId)
    } catch (error) {
      await tx.rollback()
      throw error
    }
  }

  async update(id: string, input: UpsertExerciseInput & { slug: string }) {
    const pool = await getDbPool()
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar, input.name)
      .input('slug', sql.NVarChar, input.slug)
      .input('category', sql.NVarChar, input.category || null)
      .input('muscleGroupPrimary', sql.NVarChar, input.muscleGroupPrimary || null)
      .input('difficulty', sql.NVarChar, input.difficulty || null)
      .input('description', sql.NVarChar, input.description || null)
      .query(`
        UPDATE Exercises
        SET Name = @name, Slug = @slug, Category = @category, MuscleGroupPrimary = @muscleGroupPrimary,
            Difficulty = @difficulty, Description = @description, UpdatedAt = GETDATE()
        WHERE Id = @id
      `)
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('forceType', sql.NVarChar, input.forceType || null)
      .input('mechanic', sql.NVarChar, input.mechanic || null)
      .input('equipment', sql.NVarChar, toEquipmentCsv(input.equipment))
      .input('isUnilateral', sql.Bit, input.isUnilateral ?? false)
      .input('isTimeBased', sql.Bit, input.isTimeBased ?? false)
      .query(`
        UPDATE ExerciseDetails
        SET ForceType = @forceType, Mechanic = @mechanic, Equipment = @equipment,
            IsUnilateral = @isUnilateral, IsTimeBased = @isTimeBased
        WHERE ExerciseId = @id
      `)
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('imageUrl', sql.NVarChar, input.imageUrl || null)
      .input('videoUrl', sql.NVarChar, input.videoUrl || null)
      .query(`
        UPDATE ExerciseMedia
        SET ImageUrl = @imageUrl, VideoUrl = @videoUrl
        WHERE ExerciseId = @id
      `)
    return this.findById(id)
  }

  async remove(id: string) {
    const pool = await getDbPool()
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM ExerciseMedia WHERE ExerciseId=@id`)
      await new sql.Request(tx).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM ExerciseDetails WHERE ExerciseId=@id`)
      const res = await new sql.Request(tx).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM Exercises WHERE Id=@id`)
      await tx.commit()
      return (res.rowsAffected[0] ?? 0) > 0
    } catch (error) {
      await tx.rollback()
      throw error
    }
  }
}
