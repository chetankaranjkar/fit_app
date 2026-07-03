import { api } from '../lib/api'
import type {
  TrainerAssignmentRecommendation,
  UpdateUserInstructorAssignmentDto,
  UserInstructorAssignment,
} from '../types/userInstructor'

export const userInstructorsService = {
  getByUserId: (userId: number) =>
    api.get<UserInstructorAssignment[]>(`/UserInstructors/user/${userId}`),
  update: (id: number, data: UpdateUserInstructorAssignmentDto) =>
    api.put<UserInstructorAssignment>(`/UserInstructors/${id}`, data),
  getRecommendations: (userId: number) =>
    api.get<TrainerAssignmentRecommendation[]>(`/UserInstructors/recommendations/${userId}`),
}
