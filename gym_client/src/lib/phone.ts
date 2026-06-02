/** Indian mobile: 10 digits, starting with 6–9. */
const INDIA_MOBILE_REGEX = /^[6-9]\d{9}$/

export const PHONE_MESSAGES = {
  required: 'Phone number is required.',
  length: 'Phone number must be 10 digits.',
  startDigit: 'Phone number must start with 6, 7, 8, or 9.',
  duplicate: 'This mobile number is already registered with another user.',
} as const

export function stripPhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Normalize +91 / spaces / hyphens to 10-digit Indian mobile, or null if empty/invalid. */
export function normalizePhoneNumber(value: string | null | undefined): string | null {
  let digits = stripPhoneDigits(value?.trim() ?? '')
  if (digits.length === 0) return null

  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)

  if (digits.length !== 10 || !INDIA_MOBILE_REGEX.test(digits)) return null
  return digits
}

export function getPhoneValidationError(value: string | null | undefined, required = false): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return required ? PHONE_MESSAGES.required : null

  const digits = stripPhoneDigits(trimmed)
  if (digits.length === 0) return required ? PHONE_MESSAGES.required : null

  let normalized = digits
  if (normalized.length === 12 && normalized.startsWith('91')) normalized = normalized.slice(2)
  else if (normalized.length === 11 && normalized.startsWith('0')) normalized = normalized.slice(1)

  if (normalized.length !== 10) return PHONE_MESSAGES.length
  if (!INDIA_MOBILE_REGEX.test(normalized)) return PHONE_MESSAGES.startDigit
  return null
}

/** Returns normalized 10-digit phone or throws with a clear message. */
export function validatePhoneNumber(value: string | null | undefined, required = false): string {
  const err = getPhoneValidationError(value, required)
  if (err) throw new Error(err)
  const normalized = normalizePhoneNumber(value)
  if (!normalized) throw new Error(required ? PHONE_MESSAGES.required : PHONE_MESSAGES.length)
  return normalized
}

/** Optional phone: empty is OK; non-empty must be valid. */
export function validateOptionalPhoneNumber(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return undefined
  return validatePhoneNumber(trimmed, true)
}

export function digitsOnlyPhoneInput(raw: string, maxLen = 10): string {
  return stripPhoneDigits(raw).slice(0, maxLen)
}
