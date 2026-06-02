/** Shared client-side validators — import from here or from domain modules directly. */
export {
  validatePhoneNumber,
  normalizePhoneNumber,
  getPhoneValidationError,
  validateOptionalPhoneNumber,
  digitsOnlyPhoneInput,
  PHONE_MESSAGES,
} from './phone'

export {
  validateAadhaarNumber,
  normalizeAadhaarInput,
  isValidAadhaarInput,
  displayAadhaar,
} from './aadhaar'
