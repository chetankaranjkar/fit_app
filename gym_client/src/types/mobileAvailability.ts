export interface MobileNumberAvailability {
  isAvailable: boolean
  normalizedMobileNumber?: string | null
  validationError?: string | null
  existingUserId?: number | null
  existingUserName?: string | null
}
