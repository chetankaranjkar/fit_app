import { api } from '../lib/api'

export const fileUploadService = {
  /** Staff: POST multipart `file` → `{ imageUrl }` relative to API wwwroot. */
  uploadUserProfileImage: (userId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ imageUrl: string }>(`/FileUpload/profile/user/${userId}`, formData)
  },
}
