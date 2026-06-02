import type { AxiosError } from 'axios'

const DEFAULT_FORBIDDEN =
  "You don't have permission to perform this action. Ask an administrator if you need access."

const DEFAULT_NETWORK = 'Unable to reach the server. Check your connection and try again.'

const DEFAULT_SERVER = 'Something went wrong on our side. Please try again in a moment.'

/** User-facing message for HTTP 403 responses. */
export function getForbiddenMessage(error?: unknown): string {
  const ax = error as AxiosError<{ message?: string; title?: string; detail?: string }> | undefined
  const data = ax?.response?.data
  const fromBody =
    (typeof data?.message === 'string' && data.message.trim()) ||
    (typeof data?.detail === 'string' && data.detail.trim()) ||
    (typeof data?.title === 'string' && data.title.trim())
  if (fromBody && !fromBody.toLowerCase().includes('forbidden')) return fromBody
  return DEFAULT_FORBIDDEN
}

/** Best-effort message for any API failure (mutations, query error UI). */
export function getApiErrorMessage(error: unknown, fallback = 'Request failed. Please try again.'): string {
  const ax = error as AxiosError<{ message?: string; detail?: string }> & {
    userMessage?: string
  }
  if (typeof ax?.userMessage === 'string' && ax.userMessage.trim()) return ax.userMessage

  const status = ax?.response?.status
  const data = ax?.response?.data
  if (status === 403) return getForbiddenMessage(error)
  if (status === 401) {
    if (typeof data?.message === 'string' && data.message.trim()) return data.message
    return 'Your session has expired. Please sign in again.'
  }
  if (status === 404) return 'The requested resource was not found.'
  if (status != null && status >= 500) return DEFAULT_SERVER
  if (!ax?.response) return DEFAULT_NETWORK
  if (typeof data?.message === 'string' && data.message.trim()) return data.message
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail
  if (typeof ax.message === 'string' && ax.message.trim()) return ax.message
  return fallback
}
