import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersService } from '../services/users.service'

const DEBOUNCE_MS = 400

export type UsernameAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'

export function useUsernameAvailability(
  rawUsername: string,
  options?: { excludeUserId?: number; enabled?: boolean },
) {
  const [debounced, setDebounced] = useState(rawUsername.trim())
  const enabled = options?.enabled !== false

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(rawUsername.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [rawUsername])

  const canCheck = enabled && debounced.length > 0

  const { data, isFetching } = useQuery({
    queryKey: ['username-availability', debounced.toLowerCase(), options?.excludeUserId],
    queryFn: () => usersService.checkUsernameAvailability(debounced, options?.excludeUserId),
    enabled: canCheck,
    staleTime: 30_000,
    retry: 1,
  })

  let status: UsernameAvailabilityStatus = 'idle'
  if (debounced.length === 0) status = 'idle'
  else if (!canCheck) status = 'idle'
  else if (isFetching) status = 'checking'
  else if (data?.isAvailable) status = 'available'
  else if (data) status = 'taken'
  else status = 'idle'

  const message =
    status === 'available'
      ? '✓ Email available for login'
      : status === 'taken'
        ? '✗ Email already used for login'
        : null

  const error =
    status === 'taken' ? (data?.validationError ?? 'This email is already in use for login.') : null

  return {
    status,
    message,
    error,
    isAvailable: status === 'available',
    isChecking: status === 'checking',
  }
}
