import axios from 'axios'

const API_BASE_URL = 'http://localhost:5104/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 responses (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Users
export const usersApi = {
  getAll: () => api.get('/Users'),
  getById: (id: number) => api.get(`/Users/${id}`),
  create: (data: any) => api.post('/Users', data),
  update: (id: number, data: any) => api.put(`/Users/${id}`, data),
  delete: (id: number) => api.delete(`/Users/${id}`),
  getUserDetails: (id: number) => api.get(`/Users/${id}/details`),
  addUserDetail: (data: any) => api.post('/Users/details', data),
}

// Exercises
export const exercisesApi = {
  getAll: () => api.get('/Exercises'),
  getById: (id: number) => api.get(`/Exercises/${id}`),
  getByBodyPart: (bodyPartId: number) => api.get(`/Exercises/bodypart/${bodyPartId}`),
  create: (data: any) => api.post('/Exercises', data),
  update: (id: number, data: any) => api.put(`/Exercises/${id}`, data),
  delete: (id: number) => api.delete(`/Exercises/${id}`),
}

// Body Parts
export const bodyPartsApi = {
  getAll: () => api.get('/BodyParts'),
  getById: (id: number) => api.get(`/BodyParts/${id}`),
  create: (data: any) => api.post('/BodyParts', data),
  delete: (id: number) => api.delete(`/BodyParts/${id}`),
  updateCameraPosition: (id: number, data: {
    cameraPositionJson: string
  }) => api.put(`/BodyParts/${id}/camera-position`, data),
}

// Workout Plans
export const workoutPlansApi = {
  getAll: () => api.get('/WorkoutPlans'),
  getById: (id: number) => api.get(`/WorkoutPlans/${id}`),
  getByType: (type: string) => api.get(`/WorkoutPlans/type/${type}`),
  create: (data: any) => api.post('/WorkoutPlans', data),
  delete: (id: number) => api.delete(`/WorkoutPlans/${id}`),
}

// User Schedules
export const userSchedulesApi = {
  getAll: () => api.get('/UserSchedules'),
  getById: (id: number) => api.get(`/UserSchedules/${id}`),
  getByUser: (userId: number) => api.get(`/UserSchedules/user/${userId}`),
  create: (data: any) => api.post('/UserSchedules', data),
  generateDefault: (data: any) => api.post('/UserSchedules/generate-default', data),
  update: (id: number, data: any) => api.put(`/UserSchedules/${id}`, data),
  delete: (id: number) => api.delete(`/UserSchedules/${id}`),
}

// Instructors
export const instructorsApi = {
  getAll: () => api.get('/Instructors'),
  getById: (id: number) => api.get(`/Instructors/${id}`),
  create: (data: any) => api.post('/Instructors', data),
  update: (id: number, data: any) => api.put(`/Instructors/${id}`, data),
  delete: (id: number) => api.delete(`/Instructors/${id}`),
}

// Progress Tracking
export const progressTrackingApi = {
  getAll: () => api.get('/ProgressTracking'),
  getById: (id: number) => api.get(`/ProgressTracking/${id}`),
  getByUser: (userId: number) => api.get(`/ProgressTracking/user/${userId}`),
  create: (data: any) => api.post('/ProgressTracking', data),
  delete: (id: number) => api.delete(`/ProgressTracking/${id}`),
}

// Dashboard
export const dashboardApi = {
  getStatistics: () => api.get('/Dashboard/statistics'),
}

// Body Metrics
export const bodyMetricsApi = {
  getAll: () => api.get('/BodyMetrics'),
  getById: (id: number) => api.get(`/BodyMetrics/${id}`),
  getByUser: (userId: number) => api.get(`/BodyMetrics/user/${userId}`),
  getLatestByUser: (userId: number) => api.get(`/BodyMetrics/user/${userId}/latest`),
  getCurrentByUser: (userId: number) => api.get(`/BodyMetrics/user/${userId}/current`),
  getLogsByUser: (userId: number) => api.get(`/BodyMetrics/user/${userId}/logs`),
  create: (data: any) => api.post('/BodyMetrics', data),
  update: (id: number, data: any) => api.put(`/BodyMetrics/${id}`, data),
  delete: (id: number) => api.delete(`/BodyMetrics/${id}`),
}

// Attendance Logs
export const attendanceLogsApi = {
  getAll: () => api.get('/AttendanceLogs'),
  getById: (id: number) => api.get(`/AttendanceLogs/${id}`),
  getByUser: (userId: number) => api.get(`/AttendanceLogs/user/${userId}`),
  getByAdmin: (adminId: number) => api.get(`/AttendanceLogs/admin/${adminId}`),
  getByDate: (date: string) => api.get(`/AttendanceLogs/date/${date}`),
  getByDateRange: (startDate: string, endDate: string) => api.get(`/AttendanceLogs/daterange?startDate=${startDate}&endDate=${endDate}`),
  getActiveCheckIn: (userId: number) => api.get(`/AttendanceLogs/user/${userId}/active`),
  getDailyStatistics: (startDate: string, endDate: string) => api.get(`/AttendanceLogs/statistics/daily?startDate=${startDate}&endDate=${endDate}`),
  checkIn: (data: any) => api.post('/AttendanceLogs/checkin', data),
  checkOut: (data: any) => api.post('/AttendanceLogs/checkout', data),
  create: (data: any) => api.post('/AttendanceLogs', data),
  update: (id: number, data: any) => api.put(`/AttendanceLogs/${id}`, data),
  delete: (id: number) => api.delete(`/AttendanceLogs/${id}`),
}

// File Upload
export const fileUploadApi = {
  uploadUserProfile: (userId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/FileUpload/profile/user/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  uploadInstructorProfile: (instructorId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/FileUpload/profile/instructor/${instructorId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  uploadUserBodyImage: (userId: number, file: File, imageType: string = 'FullBody', notes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('imageType', imageType)
    if (notes) formData.append('notes', notes)
    return api.post(`/FileUpload/body/user/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

// User Body Images
export const userBodyImagesApi = {
  getAll: () => api.get('/UserBodyImages'),
  getById: (id: number) => api.get(`/UserBodyImages/${id}`),
  getByUser: (userId: number) => api.get(`/UserBodyImages/user/${userId}`),
  create: (data: any) => api.post('/UserBodyImages', data),
  update: (id: number, data: any) => api.put(`/UserBodyImages/${id}`, data),
  delete: (id: number) => api.delete(`/UserBodyImages/${id}`),
}

export default api

