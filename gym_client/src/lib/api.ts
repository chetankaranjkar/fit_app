import axios from 'axios'
import toast from 'react-hot-toast'
import { getForbiddenMessage } from './apiErrors'

// Production Docker/nginx: same-origin /api. Local dev: Vite proxy or VITE_API_URL override.
const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

type RetryableRequestConfig = {
  _retry?: boolean
  headers?: Record<string, unknown>
  url?: string
}

const AUTH_KEYS = {
  token: 'token',
  user: 'user',
  sessionExpiredMessage: 'sessionExpiredMessage',
} as const

let isRefreshing = false
let pendingRequests: Array<{
  resolve: (value: string) => void
  reject: (reason?: unknown) => void
}> = []

function readRefreshToken(): string | null {
  const rawUser = localStorage.getItem(AUTH_KEYS.user)
  if (!rawUser) return null
  try {
    const user = JSON.parse(rawUser) as Record<string, unknown>
    const token = user.refreshToken ?? user.RefreshToken
    return typeof token === 'string' && token.trim() ? token : null
  } catch {
    return null
  }
}

function readStoredUser() {
  const rawUser = localStorage.getItem(AUTH_KEYS.user)
  if (!rawUser) return null
  try {
    return JSON.parse(rawUser) as Record<string, unknown>
  } catch {
    return null
  }
}

function storeSession(accessToken: string, refreshToken?: string) {
  localStorage.setItem(AUTH_KEYS.token, accessToken)
  const currentUser: Record<string, unknown> | null = readStoredUser()
  if (!currentUser) return
  const nextUser = { ...currentUser, token: accessToken }
  if (refreshToken) nextUser.refreshToken = refreshToken
  localStorage.setItem(AUTH_KEYS.user, JSON.stringify(nextUser))
}

function clearSession(message?: string) {
  localStorage.removeItem(AUTH_KEYS.token)
  localStorage.removeItem(AUTH_KEYS.user)
  if (message) sessionStorage.setItem(AUTH_KEYS.sessionExpiredMessage, message)
}

function flushPending(error: unknown, token: string | null) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(error)
  })
  pendingRequests = []
}

async function requestTokenRefresh() {
  const refreshToken = readRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  const response = await axios.post(
    `${API_BASE_URL}/Auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  )

  const data = (response?.data ?? {}) as Record<string, unknown>
  const nextAccessToken = String(data.token ?? data.Token ?? '')
  const nextRefreshToken = (data.refreshToken ?? data.RefreshToken) as string | undefined
  if (!nextAccessToken.trim()) throw new Error('Refresh endpoint did not return access token')

  storeSession(nextAccessToken, nextRefreshToken)
  return nextAccessToken
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error.config ?? {}) as RetryableRequestConfig
    const requestUrl = String(originalRequest.url ?? '')
    const requestUrlLower = requestUrl.toLowerCase()
    const isAuthRequest =
      requestUrlLower.includes('/auth/login') ||
      requestUrlLower.includes('/auth/refresh') ||
      requestUrlLower.includes('/auth/logout')

    if (error.response?.status === 401 && !isAuthRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token: string) => {
              originalRequest.headers = originalRequest.headers ?? {}
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest as any))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newAccessToken = await requestTokenRefresh()
        flushPending(null, newAccessToken)
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest as any)
      } catch (refreshError) {
        flushPending(refreshError, null)
        clearSession('Your session expired. Please login again.')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status === 401) {
      // Do not redirect when 401 is from the login endpoint itself (failed credentials)
      const isLoginRequest =
        typeof error.config?.url === 'string' &&
        (error.config.url.toLowerCase().includes('/auth/login') ||
          error.config.url.toLowerCase().endsWith('auth/login'))
      if (!isLoginRequest) {
        clearSession('Your session expired. Please login again.')
        window.location.href = '/login'
      }
    }

    if (error.response?.status === 403) {
      const friendly = getForbiddenMessage(error)
      ;(error as { userMessage?: string }).userMessage = friendly
      const method = String(error.config?.method ?? 'get').toLowerCase()
      if (method !== 'get' && method !== 'head') {
        toast.error(friendly)
      }
    }

    return Promise.reject(error)
  }
)
