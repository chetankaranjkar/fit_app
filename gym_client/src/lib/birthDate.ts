export const MIN_BIRTH_DATE = '1900-01-01'

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false

  const [year, month, day] = value.split('-').map((part) => Number(part))
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (year < 1900 || year > 9999) return false
  if (month < 1 || month > 12 || day < 1 || day > 31) return false

  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  )
}

export function getBirthDateError(
  value: string | null | undefined,
  options?: { required?: boolean; maxDate?: string; minDate?: string; label?: string },
): string | null {
  const label = options?.label ?? 'Date of birth'
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return options?.required ? `${label} is required.` : null

  if (!ISO_DATE_REGEX.test(trimmed)) {
    return `${label} must use YYYY-MM-DD (e.g. 1990-05-15).`
  }

  const year = Number(trimmed.slice(0, 4))
  if (year < 1900) return `${label} year must be 1900 or later.`
  if (year > 9999) return `${label} year is not valid.`

  if (!isValidIsoDate(trimmed)) return `Enter a valid ${label.toLowerCase()}.`

  const maxDate = options?.maxDate ?? todayIsoDate()
  if (trimmed > maxDate) return `${label} cannot be in the future.`

  const minDate = options?.minDate ?? MIN_BIRTH_DATE
  if (trimmed < minDate) return `${label} must be on or after ${minDate}.`

  return null
}

/** Accept only empty or a fully valid ISO date for controlled date inputs. */
export function acceptIsoDateInput(raw: string): string | null {
  if (!raw) return ''
  return isValidIsoDate(raw) ? raw : null
}
