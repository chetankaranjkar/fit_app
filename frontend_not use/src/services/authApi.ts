import api from './api'

export interface LoginDto {
  username: string
  password: string
  role: number // 1 = User, 2 = Instructor, 3 = Admin
}

export interface LoginResponse {
  token: string
  username: string
  email: string
  role: string
  userId?: number
  instructorId?: number
  adminId?: number
  fullName: string
}

export const authApi = {
  login: (data: LoginDto) => api.post<LoginResponse>('/Auth/login', data),
  register: (data: LoginDto) => api.post('/Auth/register', data),
}

