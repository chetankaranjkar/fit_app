import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../../services/auth.service'
import { getPostLoginPath, resolveDashboardRole } from '../roleRouting'
import type { LoginCredentials } from '../../../types/auth'

export function useLoginMutation() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await authService.login(credentials)
      return authService.normalizeLoginResponse((data ?? {}) as unknown as Record<string, unknown>)
    },
    onSuccess: (data) => {
      const token = data?.token?.trim()
      if (!token) return
      authService.storeSession(data)
      const role = resolveDashboardRole(data)
      navigate(getPostLoginPath(role), { replace: true })
    },
    onError: (error: { response?: { data?: unknown; status?: number }; message?: string }) => {
      console.error('Login failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    },
  })
}
