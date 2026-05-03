import { WorkoutRepository } from './workout.repository.js'
import type {
  UpdateWorkoutExerciseInput,
  UpsertWorkoutInput,
  WorkoutExerciseInput,
  WorkoutListQuery,
} from './workout.types.js'

export class WorkoutService {
  private readonly repository = new WorkoutRepository()

  async list(query: WorkoutListQuery) {
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

  getById(id: string) {
    return this.repository.findById(id)
  }

  create(input: UpsertWorkoutInput) {
    return this.repository.create(input)
  }

  update(id: string, input: UpsertWorkoutInput) {
    return this.repository.update(id, input)
  }

  delete(id: string) {
    return this.repository.delete(id)
  }

  addExercise(workoutId: string, input: WorkoutExerciseInput) {
    return this.repository.addExercise(workoutId, input)
  }

  updateExercise(id: string, input: UpdateWorkoutExerciseInput) {
    return this.repository.updateExercise(id, input)
  }

  removeExercise(id: string) {
    return this.repository.removeExercise(id)
  }

  reorderWorkoutExercises(workoutId: string, items: Array<{ id: string; orderIndex: number; workoutDayId?: string | null }>) {
    return this.repository.reorderWorkoutExercises(workoutId, items)
  }
}
