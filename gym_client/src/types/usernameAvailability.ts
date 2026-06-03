export interface UsernameAvailability {
  isAvailable: boolean
  validationError?: string | null
  existingUserId?: number | null
  existingUserName?: string | null
}
