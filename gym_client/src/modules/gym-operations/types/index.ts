/**
 * Gym Operations module — type definitions.
 *
 * Kept self-contained to the module. No shared types are modified.
 */

export type EquipmentStatus =
  | 'OPERATIONAL'
  | 'UNDER_MAINTENANCE'
  | 'OUT_OF_ORDER'
  | 'RETIRED'

export type EquipmentCategory =
  | 'Cardio'
  | 'Strength'
  | 'Functional'
  | 'Accessory'

export interface Equipment {
  id: string
  name: string
  category: EquipmentCategory
  brand?: string
  serialNumber?: string
  location: string
  purchaseDate: string
  purchaseCost: number
  status: EquipmentStatus
  nextServiceDate?: string
  notes?: string
}

export type MaintenanceType = 'ROUTINE' | 'REPAIR' | 'INSPECTION'

export interface MaintenanceLog {
  id: string
  equipmentId: string
  equipmentName: string
  type: MaintenanceType
  performedAt: string
  performedBy: string
  cost?: number
  description: string
  nextServiceDate?: string
}

/** Payload for creating a new maintenance log (UI -> API). */
export interface MaintenanceInput {
  equipmentId: string
  type: MaintenanceType
  performedAt: string
  performedBy: string
  cost?: number
  description: string
  nextServiceDate?: string
}

export type ExpenseCategory =
  | 'Utilities'
  | 'Maintenance'
  | 'Supplies'
  | 'Marketing'
  | 'Salaries'
  | 'Other'

export type ExpenseStatus = 'PAID' | 'PENDING'

export interface Expense {
  id: string
  category: ExpenseCategory
  vendor?: string
  amount: number
  incurredAt: string
  description: string
  status: ExpenseStatus
}

export type CleaningShift = 'MORNING' | 'AFTERNOON' | 'EVENING'

export interface CleaningTask {
  id: string
  label: string
  done: boolean
}

export interface CleaningLog {
  id: string
  area: string
  shift: CleaningShift
  scheduledAt: string
  performedBy?: string
  performedAt?: string
  tasks: CleaningTask[]
}

export type VendorCategory =
  | 'Equipment'
  | 'Cleaning'
  | 'Maintenance'
  | 'Supplies'
  | 'IT'
  | 'Other'

export interface Vendor {
  id: string
  name: string
  category: VendorCategory
  contactPerson?: string
  email?: string
  phone?: string
  rating?: number
  onContract: boolean
  notes?: string
}

export interface EquipmentFilters {
  query: string
  status: 'ALL' | EquipmentStatus
  category: 'ALL' | EquipmentCategory
}

export const DEFAULT_EQUIPMENT_FILTERS: EquipmentFilters = {
  query: '',
  status: 'ALL',
  category: 'ALL',
}
