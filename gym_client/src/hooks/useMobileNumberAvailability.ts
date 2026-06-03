import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPhoneValidationError, normalizePhoneNumber, PHONE_MESSAGES } from '../lib/phone'
import { usersService } from '../services/users.service'

const DEBOUNCE_MS = 400

export type MobileAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid_format'

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

  const { data, isFetching } = useQuery({
    queryKey: ['mobile-availability', normalized, options?.excludeUserId],
    queryFn: () => usersService.checkMobileAvailability(normalized!, options?.excludeUserId),
    enabled: canCheck,
    staleTime: 30_000,
    retry: 1,
  })

  let status: MobileAvailabilityStatus = 'idle'
  if (debounced.length === 0) status = 'idle'
  else if (formatError) status = 'invalid_format'
  else if (!canCheck) status = 'idle'
  else if (isFetching) status = 'checking'
  else if (data?.isAvailable) status = 'available'
  else if (data) status = 'taken'
  else status = 'idle'

  const message =
    status === 'available'
      ? '✓ Mobile number available'
      : status === 'taken'
        ? '✗ Mobile number already registered'
        : status === 'invalid_format'
          ? (formatError ?? PHONE_MESSAGES.length)
          : null

  const error =
    status === 'taken'
      ? (data?.validationError ?? PHONE_MESSAGES.duplicate)
      : status === 'invalid_format'
        ? formatError
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
