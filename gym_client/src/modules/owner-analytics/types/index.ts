/**
 * Owner Analytics module \u2014 isolated types.
 *
 * Nothing outside this module imports from here. IDs are strings to keep us
 * interoperable with both UUIDs and numeric DB keys later.
 */

export type KpiType = 'revenue' | 'members' | 'payments' | 'equipment'

export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'REFUNDED'

export interface PaymentEntry {
  id: string
  memberName: string
  amount: number
  date: string // ISO
  status: PaymentStatus
  plan?: string
}

export interface PendingDue {
  id: string
  memberName: string
  dueAmount: number
  dueDate: string // ISO
  plan?: string
  remindersSent?: number
}

export type MemberStatus = 'ACTIVE' | 'INACTIVE'

export interface ActiveMember {
  id: string
  name: string
  plan: string
  lastVisit: string // ISO
  status: MemberStatus
}

export type EquipmentStatus = 'OUT_OF_ORDER' | 'UNDER_MAINTENANCE' | 'RESOLVED'

export interface EquipmentIssue {
  id: string
  equipmentName: string
  location?: string
  issue: string
  status: EquipmentStatus
  reportedDate: string // ISO
  resolvedDate?: string // ISO; set when status = RESOLVED
}

/** Single data point used by the revenue sparkline. */
export interface RevenuePoint {
  date: string // ISO date (no time)
  amount: number
}

// ---------------------------------------------------------------------------
// Filter shapes (drawer-scoped)
// ---------------------------------------------------------------------------

export type RevenueRange = '7d' | '30d'

export type MembersFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'
