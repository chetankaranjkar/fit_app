import { authService } from '../services/auth.service'

const AADHAAR_DIGITS_REGEX = /^\d{12}$/

export function stripAadhaarFormatting(value: string): string {
  return value.replace(/\D/g, '')
}

/** Alias for consistent validation naming across the app. */
export function validateAadhaarNumber(value: string | null | undefined, required = false): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) {
    if (required) throw new Error('Aadhaar number is required.')
    return undefined
  }
  return normalizeAadhaarInput(trimmed)
}

export function isValidAadhaarInput(value: string): boolean {
  const digits = stripAadhaarFormatting(value.trim())
  return digits.length === 0 || AADHAAR_DIGITS_REGEX.test(digits)
}

export function normalizeAadhaarInput(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  const digits = stripAadhaarFormatting(trimmed)
  if (!AADHAAR_DIGITS_REGEX.test(digits)) {
    throw new Error('Aadhaar number must be exactly 12 digits.')
  }
  return digits
}

/** XXXX XXXX 1234 */
export function maskAadhaar(digitsOnly: string | null | undefined): string {
  if (!digitsOnly || digitsOnly.length < 4) return '—'
  const last4 = digitsOnly.slice(-4)
  return `XXXX XXXX ${last4}`
}

/** Admin / Super Admin may view full Aadhaar in the UI. */
export function canViewFullAadhaar(): boolean {
  return authService.hasAppRole('ADMIN') || authService.hasAppRole('SUPER ADMIN')
}

export function formatFullAadhaar(digitsOnly: string): string {
  if (digitsOnly.length !== 12) return digitsOnly
  return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 8)} ${digitsOnly.slice(8)}`
}

export function displayAadhaar(user: {
  aadhaarNumber?: string | null
  aadhaarNumberMasked?: string | null
}): string {
  if (canViewFullAadhaar() && user.aadhaarNumber) return formatFullAadhaar(user.aadhaarNumber)
  if (user.aadhaarNumberMasked) return user.aadhaarNumberMasked
  if (user.aadhaarNumber) return maskAadhaar(user.aadhaarNumber)
  return '—'
}

export function formatAadhaarForExport(user: {
  aadhaarNumber?: string | null
  aadhaarNumberMasked?: string | null
}): string {
  if (canViewFullAadhaar() && user.aadhaarNumber) return user.aadhaarNumber
  if (user.aadhaarNumberMasked) return user.aadhaarNumberMasked
  return ''
}
