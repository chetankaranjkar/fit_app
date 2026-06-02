import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPhoneValidationError, normalizePhoneNumber } from '../lib/phone'
import { usersService } from '../services/users.service'

const DEBOUNCE_MS = 400

export type MobileAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function useMobileNumberAvailability(
  rawMobile: string,
  options?: { excludeUserId?: number; enabled?: boolean },
) {
  const [debounced, setDebounced] = useState(rawMobile.trim())
  const enabled = options?.enabled !== false

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(rawMobile.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [rawMobile])

  const formatError = getPhoneValidationError(debounced, true)
  const normalized = formatError ? null : normalizePhoneNumber(debounced)
  const canCheck = enabled && normalized != null && normalized.length === 10

  const { data, isFetching, isError } = useQuery({
    queryKey: ['mobile-availability', normalized, options?.excludeUserId],
    queryFn: async () => (await usersService.checkMobileAvailability(normalized!, options?.excludeUserId)).data,
    enabled: canCheck,
    staleTime: 30_000,
    retry: 0,
  })

  let status: MobileAvailabilityStatus = 'idle'
  if (debounced.length === 0) status = 'idle'
  else if (formatError) status = 'invalid'
  else if (!canCheck) status = 'idle'
  else if (isFetching) status = 'checking'
  else if (isError) status = 'invalid'
  else if (data?.isAvailable) status = 'available'
  else status = 'taken'

  const message =
    status === 'available'
      ? '✓ Mobile Number Available'
      : status === 'taken'
        ? '✗ Mobile Number Already Registered'
        : status === 'invalid'
          ? formatError ?? data?.validationError ?? 'Invalid mobile number'
          : null

  const error =
    status === 'taken'
      ? data?.validationError ?? 'This mobile number is already registered with another user.'
      : status === 'invalid'
        ? formatError ?? data?.validationError ?? null
        : null

  return {
    status,
    message,
    error,
    isAvailable: status === 'available',
    isChecking: status === 'checking',
    normalizedMobile: normalized,
  }
}
