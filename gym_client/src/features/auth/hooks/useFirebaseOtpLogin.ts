import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../../services/auth.service'
import { getPostLoginPath, resolveDashboardRole } from '../roleRouting'
import { logFirebaseOtpError } from '../utils/firebaseAuthErrors'

export function useFirebaseOtpLogin() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (idToken: string) => {
      const { data } = await authService.firebaseLogin(idToken)
      return authService.normalizeLoginResponse((data ?? {}) as unknown as Record<string, unknown>)
    },
    onSuccess: (data) => {
      const token = data?.token?.trim()
      if (!token) return
      authService.storeSession(data)
      const role = resolveDashboardRole(data)
      navigate(getPostLoginPath(role), { replace: true })
    },
    onError: (error: { response?: { data?: unknown; status?: number }; message?: string; code?: string }) => {
      logFirebaseOtpError('Gym API firebase-login failed', error)
      console.error('Firebase OTP login failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    },
  })
}
