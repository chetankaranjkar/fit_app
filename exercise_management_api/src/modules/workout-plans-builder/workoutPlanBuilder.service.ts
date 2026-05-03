import { WorkoutPlanBuilderRepository } from './workoutPlanBuilder.repository.js'
import type {
  AddWorkoutDayExerciseInput,
  AddWorkoutPlanDayInput,
  CreateWorkoutPlanInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutPlanDayInput,
} from './workoutPlanBuilder.types.js'

export class WorkoutPlanBuilderService {
  private readonly repository = new WorkoutPlanBuilderRepository()

  createWorkoutPlan(input: CreateWorkoutPlanInput) {
    return this.repository.createWorkoutPlan(input)
  }

  getWorkoutPlanById(id: number) {
    return this.repository.getWorkoutPlanById(id)
  }

  addDay(workoutPlanId: number, input: AddWorkoutPlanDayInput) {
    return this.repository.addDay(workoutPlanId, input)
  }

  updateDay(dayId: number, input: UpdateWorkoutPlanDayInput) {
    return this.repository.updateDay(dayId, input)
  }

  deleteDay(dayId: number) {
    return this.repository.deleteDay(dayId)
  }

  addExercise(dayId: number, input: AddWorkoutDayExerciseInput) {
    return this.repository.addExercise(dayId, input)
  }

  updateExercise(exerciseRowId: number, input: UpdateWorkoutExerciseInput) {
    return this.repository.updateExercise(exerciseRowId, input)
  }

  deleteExercise(exerciseRowId: number) {
    return this.repository.deleteExercise(exerciseRowId)
  }
}
