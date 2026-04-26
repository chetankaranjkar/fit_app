import slugify from 'slugify'
import { ExerciseRepository } from './exercise.repository.js'
import type { ExerciseListQuery, UpsertExerciseInput } from './exercise.types.js'

export class ExerciseService {
  constructor(private readonly repository = new ExerciseRepository()) {}

  async getList(query: ExerciseListQuery) {
    const { items, totalCount } = await this.repository.list(query)
    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / query.pageSize)),
      },
    }
  }

  async getById(id: string) {
    return this.repository.findById(id)
  }

  async create(input: UpsertExerciseInput) {
    const slug = slugify(input.name, { lower: true, strict: true })
    return this.repository.create({ ...input, slug })
  }

  async update(id: string, input: UpsertExerciseInput) {
    const slug = slugify(input.name, { lower: true, strict: true })
    return this.repository.update(id, { ...input, slug })
  }

  async delete(id: string) {
    return this.repository.remove(id)
  }
}
