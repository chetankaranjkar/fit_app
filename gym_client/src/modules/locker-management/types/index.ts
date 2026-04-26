/**
 * Locker Management module — all types in one place.
 *
 * Isolated from the rest of the app: nothing outside this module imports
 * these types. IDs are strings so we can interop with both UUIDs (Prisma-style
 * plan in the spec) and numeric DB ids (current ASP.NET Core backend).
 */

export type LockerSize = 'Small' | 'Medium' | 'Large'
export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'

export interface Locker {
  id: string
  lockerNumber: string
  size: LockerSize
  status: LockerStatus
  location?: string
}

export interface LockerAssignment {
  id: string
  lockerId: string
  lockerNumber: string
  memberName: string
  assignedDate: string
  expiryDate: string
}

export type AccessAction = 'OPEN' | 'CLOSE'

export interface LockerAccessLog {
  id: string
  lockerId: string
  lockerNumber: string
  memberName: string
  action: AccessAction
  accessTime: string
}

export type MaintenanceStatus = 'PENDING' | 'FIXED'

export interface LockerMaintenance {
  id: string
  lockerId: string
  lockerNumber: string
  issue: string
  reportedDate: string
  status: MaintenanceStatus
}

// ---------------------------------------------------------------------------
// Filter shapes
// ---------------------------------------------------------------------------

export interface LockerFilters {
  query: string
  status: LockerStatus | 'ALL'
  size: LockerSize | 'ALL'
}

export const DEFAULT_LOCKER_FILTERS: LockerFilters = {
  query: '',
  status: 'ALL',
  size: 'ALL',
}

export interface AssignmentFilters {
  query: string
  state: 'ALL' | 'ACTIVE' | 'EXPIRED'
}

export const DEFAULT_ASSIGNMENT_FILTERS: AssignmentFilters = {
  query: '',
  state: 'ALL',
}

export interface AccessLogFilters {
  query: string
  action: AccessAction | 'ALL'
}

export const DEFAULT_ACCESS_LOG_FILTERS: AccessLogFilters = {
  query: '',
  action: 'ALL',
}

export interface MaintenanceFilters {
  query: string
  status: MaintenanceStatus | 'ALL'
}

export const DEFAULT_MAINTENANCE_FILTERS: MaintenanceFilters = {
  query: '',
  status: 'ALL',
}
