import { api } from '../lib/api'
import type {
  BodyPart,
  BodyPartMuscle,
  CreateBodyPartDto,
  UpdateBodyPartDto,
  CreateBodyPartMuscleDto,
  UpdateBodyPartMuscleDto,
} from '../types/bodyPart'

export const bodyPartsService = {
  getAll: () => api.get<BodyPart[]>('/BodyParts'),
  getById: (id: number) => api.get<BodyPart>(`/BodyParts/${id}`),
  create: (data: CreateBodyPartDto) => api.post<BodyPart>('/BodyParts', data),
  update: (id: number, data: UpdateBodyPartDto) => api.put<BodyPart>(`/BodyParts/${id}`, data),
  delete: (id: number) => api.delete(`/BodyParts/${id}`),
  uploadImage: (bodyPartId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ imageUrl: string }>(`/FileUpload/body-part/${bodyPartId}`, formData)
  },
}

export const bodyPartMusclesService = {
  getByBodyPartId: (bodyPartId: number) =>
    api.get<BodyPartMuscle[]>(`/BodyPartMuscles/by-body-part/${bodyPartId}`),
  getById: (id: number) => api.get<BodyPartMuscle>(`/BodyPartMuscles/${id}`),
  create: (data: CreateBodyPartMuscleDto) => api.post<BodyPartMuscle>('/BodyPartMuscles', data),
  update: (id: number, data: UpdateBodyPartMuscleDto) =>
    api.put<BodyPartMuscle>(`/BodyPartMuscles/${id}`, data),
  delete: (id: number) => api.delete(`/BodyPartMuscles/${id}`),
  uploadImage: (bodyPartMuscleId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ imageUrl: string }>(`/FileUpload/body-part-muscle/${bodyPartMuscleId}`, formData)
  },
}
