export function getLoginErrorMessage(
  err:
    | { response?: { data?: unknown; status?: number }; message?: string; code?: string }
    | null,
  fallback = 'Sign in failed. Please try again.'
): string {
  if (!err) return fallback
  const status = err.response?.status
  const data = err.response?.data
  if (data != null) {
    const msg =
      typeof data === 'string'
        ? data
        : (data as { message?: string; detail?: string; title?: string }).message ??
          (data as { detail?: string }).detail ??
          (data as { title?: string }).title
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
    if (typeof data === 'object' && data !== null && !Array.isArray(data))
      return String(
        (data as Record<string, unknown>).message ?? (data as Record<string, unknown>).detail ?? data
      )
  }
  const isNetworkError = err.message === 'Network Error' || err.code === 'ERR_NETWORK'
  if (isNetworkError) {
    return import.meta.env.DEV
      ? 'Cannot reach the API. Start the backend (port 5104) and the Vite dev server.'
      : 'Cannot reach the API. Check that gym-api and gym-gateway are running on the server.'
  }
  if (status === 401) return fallback
  if (status === 503) return 'OTP login is not configured on the server.'
  return err.message ?? fallback
}
