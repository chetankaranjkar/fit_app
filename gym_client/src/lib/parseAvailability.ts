import type { MobileNumberAvailability } from '../types/mobileAvailability'
import type { UsernameAvailability } from '../types/usernameAvailability'

function readBool(data: Record<string, unknown>, camel: string, pascal: string): boolean {
  const v = data[camel] ?? data[pascal]
  return v === true || v === 'true'
}

function readStr(data: Record<string, unknown>, camel: string, pascal: string): string | null | undefined {
  const v = data[camel] ?? data[pascal]
  return typeof v === 'string' ? v : v == null ? null : String(v)
}

function readNum(data: Record<string, unknown>, camel: string, pascal: string): number | null | undefined {
  const v = data[camel] ?? data[pascal]
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseMobileAvailability(data: unknown): MobileNumberAvailability {
  const d = (data ?? {}) as Record<string, unknown>
  return {
    isAvailable: readBool(d, 'isAvailable', 'IsAvailable'),
    normalizedMobileNumber: readStr(d, 'normalizedMobileNumber', 'NormalizedMobileNumber') ?? null,
    validationError: readStr(d, 'validationError', 'ValidationError') ?? null,
    existingUserId: readNum(d, 'existingUserId', 'ExistingUserId') ?? null,
    existingUserName: readStr(d, 'existingUserName', 'ExistingUserName') ?? null,
  }
}

export function parseUsernameAvailability(data: unknown): UsernameAvailability {
  const d = (data ?? {}) as Record<string, unknown>
  return {
    isAvailable: readBool(d, 'isAvailable', 'IsAvailable'),
    validationError: readStr(d, 'validationError', 'ValidationError') ?? null,
    existingUserId: readNum(d, 'existingUserId', 'ExistingUserId') ?? null,
    existingUserName: readStr(d, 'existingUserName', 'ExistingUserName') ?? null,
  }
}
