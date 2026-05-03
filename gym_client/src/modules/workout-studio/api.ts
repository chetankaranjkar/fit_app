import axios from 'axios'
import {
  createExercise,
  fetchExercises,
} from '../exercise-management/api'
import type {
  AiWorkoutResult,
  ExerciseLibraryItem,
  GenerateAiWorkoutInput,
  Workout,
} from './types'

const workoutApi = axios.create({
  baseURL: import.meta.env.VITE_EXERCISE_API_URL ?? 'http://localhost:4300/api',
})

function buildClientFallbackWorkout(payload: GenerateAiWorkoutInput): AiWorkoutResult {
  const focuses = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Conditioning', 'Recovery']
  return {
    source: 'fallback',
    explanation: 'Generated locally because AI service was unavailable.',
    plan: Array.from({ length: payload.days }).map((_, index) => ({
      day: `Day ${index + 1}`,
      focus: focuses[index % focuses.length],
      exercises: [
        { name: 'Squat', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Deadlift', sets: 3, reps: '5-8', rest: '120s' },
      ],
    })),
  }
}

type ApiWorkout = {
  id: string
  name: string
  description?: string | null
  goal?: string | null
  difficulty?: string | null
  duration?: number | null
  days?: Array<{ id: string; dayName: string; orderIndex: number }>
  exercises?: Array<{
    id: string
    workoutDayId?: string | null
    exerciseId?: string
    orderIndex: number
    sets?: number
    reps?: number
    weight?: number
    duration?: number
    restTime?: number
    notes?: string
    supersetGroup?: string
    exerciseName?: string
    name?: string
    category?: string
    muscleGroupPrimary?: string
    difficulty?: string
    imageUrl?: string
    videoUrl?: string
  }>
}

function normalizeWorkout(input: ApiWorkout): Workout {
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? null,
    goal: input.goal ?? null,
    difficulty: input.difficulty ?? null,
    duration: input.duration ?? null,
    days: (input.days ?? []).map((day) => ({
      id: day.id,
      dayName: day.dayName,
      orderIndex: day.orderIndex,
    })),
    exercises: (input.exercises ?? []).map((item) => ({
      clientKey: item.id,
      id: item.exerciseId ?? item.id,
      workoutExerciseId: item.id,
      name: item.exerciseName ?? item.name ?? 'Exercise',
      category: item.category ?? null,
      muscleGroupPrimary: item.muscleGroupPrimary ?? null,
      difficulty: item.difficulty ?? null,
      imageUrl: item.imageUrl ?? null,
      videoUrl: item.videoUrl ?? null,
      workoutDayId: item.workoutDayId ?? null,
      orderIndex: item.orderIndex ?? 0,
      sets: item.sets,
      reps: item.reps,
      weight: item.weight,
      duration: item.duration,
      restTime: item.restTime,
      notes: item.notes,
      supersetGroup: item.supersetGroup,
      isExpanded: true,
    })),
  }
}

export async function fetchExerciseLibrary(search?: string): Promise<ExerciseLibraryItem[]> {
  const data = await fetchExercises({ page: 1, pageSize: 120, search })
  return data.items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    muscleGroupPrimary: item.muscleGroupPrimary,
    difficulty: item.difficulty,
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl,
  }))
}

export async function fetchWorkouts(page = 1, pageSize = 20) {
  const { data } = await workoutApi.get<{ success: boolean; data: { items: ApiWorkout[] } }>('/workouts', {
    params: { page, pageSize },
  })
  return data.data.items.map(normalizeWorkout)
}

export async function createWorkout(payload: {
  name: string
  description?: string
  goal?: string
  difficulty?: string
  duration?: number
  days?: Array<{ dayName: string; orderIndex: number }>
}) {
  const { data } = await workoutApi.post<{ success: boolean; data: ApiWorkout }>('/workouts', payload)
  return normalizeWorkout(data.data)
}

export async function fetchWorkoutById(id: string) {
  const { data } = await workoutApi.get<{ success: boolean; data: ApiWorkout }>(`/workouts/${id}`)
  return normalizeWorkout(data.data)
}

export async function addWorkoutExercise(
  workoutId: string,
  payload: {
    exerciseId: string
    workoutDayId?: string | null
    orderIndex: number
    sets?: number
    reps?: number
    weight?: number
    restTime?: number
    duration?: number
    notes?: string
  },
) {
  const { data } = await workoutApi.post<{ success: boolean; data: ApiWorkout }>(`/workouts/${workoutId}/exercises`, payload)
  return normalizeWorkout(data.data)
}

export async function reorderWorkoutExercises(
  workoutId: string,
  items: Array<{ id: string; orderIndex: number; workoutDayId?: string | null }>,
) {
  const { data } = await workoutApi.patch<{ success: boolean; data: ApiWorkout }>(`/workouts/${workoutId}/reorder-exercises`, { items })
  return normalizeWorkout(data.data)
}

export async function updateWorkoutExercise(id: string, payload: Record<string, unknown>) {
  const { data } = await workoutApi.put<{ success: boolean; data: ApiWorkout }>(`/workout-exercises/${id}`, payload)
  return normalizeWorkout(data.data)
}

export async function deleteWorkoutExercise(id: string) {
  const { data } = await workoutApi.delete<{ success: boolean; data: ApiWorkout }>(`/workout-exercises/${id}`)
  return normalizeWorkout(data.data)
}

export async function generateAiWorkout(payload: GenerateAiWorkoutInput) {
  try {
    const { data } = await workoutApi.post<{ success: boolean; data: AiWorkoutResult }>('/ai/generate-workout', payload)
    if (!data?.data?.plan?.length) {
      return buildClientFallbackWorkout(payload)
    }
    return data.data
  } catch {
    return buildClientFallbackWorkout(payload)
  }
}

export async function quickCreateExercise(name: string) {
  return createExercise({
    name,
    category: 'General',
    muscleGroupPrimary: 'Full Body',
    difficulty: 'Beginner',
    description: `Quick add exercise: ${name}`,
  })
}
