import type { PendingMembershipPaymentRedirect } from './membershipPayment'

/** Backend Role enum: 1 = User (Member), 2 = Instructor, 3 = Admin. API may send number or string. */
export type UserRole = 1 | 2 | 3
export type UserRoleString = 'User' | 'Instructor' | 'Admin'

const ROLE_TO_LABEL: Record<string, string> = {
  1: 'Member',
  2: 'Instructor',
  3: 'Admin',
  User: 'Member',
  Instructor: 'Instructor',
  Admin: 'Admin',
}

export function getRoleLabel(role: UserRole | UserRoleString | number | string | null | undefined): string {
  if (role == null || role === '') return '—'
  return ROLE_TO_LABEL[String(role)] ?? '—'
}

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  dateOfBirth: string
  gender: string
  registrationDate: string
  address?: string | null
  emergencyContact?: string | null
  emergencyPhone?: string | null
  profilePictureUrl?: string | null
  preferredGymTime?: string | null
  isActive: boolean
  /** Login role when user has an account: 1/'User' = Member, 2/'Instructor', 3/'Admin' (API may send number or string) */
  role?: UserRole | UserRoleString | number | string | null
  /** Login username when user has an account */
  username?: string | null
  /** User types (e.g. Admin, Trainer, Staff, Member) - a user can have many */
  userTypes?: { id: number; name: string; description?: string | null }[]
  /** Assigned trainer (when returned by API). */
  trainerId?: number | null
  /** Active trainer assignment for edit-form prefill (GET user by id). */
  assignedTrainerId?: number | null
  /** Coach display name when assignedTrainerId is set (list/detail APIs). */
  assignedTrainerName?: string | null
  currentMembershipPlanId?: number | null
  currentMembershipStartDate?: string | null
  /** After create/update membership when billing is unpaid; use to open collect-payment flow. */
  pendingPaymentCollection?: PendingMembershipPaymentRedirect | null
  membershipPaymentStatus?: string | null
  pendingPaymentAmount?: number | null
  paymentNextDueDate?: string | null
  paymentLastPaidDate?: string | null
  isPaymentOverdue?: boolean
  openMembershipPaymentId?: number | null
  openMembershipId?: number | null
}

export interface CreateUserDto {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  dateOfBirth: string
  gender: string
  address?: string | null
  emergencyContact?: string | null
  emergencyPhone?: string | null
  profilePictureUrl?: string | null
  preferredGymTime?: string | null
  isActive: boolean
  username?: string | null
  password?: string | null
  /** Role for login account when username/password set: 1 Member, 2 Instructor, 3 Admin. Default Member. */
  role?: UserRole | UserRoleString | number | string | null
  /** Optional. If set, a membership will be created for the user. */
  planId?: number | null
  /** Optional. Start date for membership (defaults to today if planId is set). */
  membershipStartDate?: string | null
  /** Optional. Trainer to assign to the user. */
  trainerId?: number | null
  /** When role is Instructor: specialization (e.g. Yoga, Strength). */
  instructorSpecialization?: string | null
  /** When role is Instructor: short bio. */
  instructorBio?: string | null
  /** When role is Instructor: hire date (ISO date string). */
  instructorHireDate?: string | null
  /** User type IDs (e.g. Admin, Trainer, Staff, Member). A user can have many. */
  userTypeIds?: number[]
}

export interface UpdateUserDto {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  address?: string | null
  emergencyContact?: string | null
  emergencyPhone?: string | null
  profilePictureUrl?: string | null
  preferredGymTime?: string | null
  isActive?: boolean | null
  /** Optional. If set, a new membership will be added for the user. */
  planId?: number | null
  /** Optional. Start date for new membership (defaults to today if planId is set). */
  membershipStartDate?: string | null
  /** Optional. Trainer to assign to the user. */
  trainerId?: number | null
  /** User type IDs to assign. Replaces existing. */
  userTypeIds?: number[] | null
  /** Admin: set a new login password (min 6 characters). Omit to leave unchanged. */
  password?: string | null
  /** Login email when creating a new account (if user has no login yet). */
  email?: string | null
}
