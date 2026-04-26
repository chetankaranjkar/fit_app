export type TrainerSalaryType = 'fixed' | 'per_session'
export type TrainerStatus = 'active' | 'inactive'
export type AttendanceStatus = 'present' | 'absent'
export type PayrollStatus = 'paid' | 'pending'
export type TrainerModuleTab =
  | 'dashboard'
  | 'management'
  | 'attendance-sessions'
  | 'payroll'
  | 'reports'
  | 'documents'

export interface TrainerRecord {
  id: string
  name: string
  phone: string
  specialization: string
  salaryType: TrainerSalaryType
  salaryAmount: number
  joiningDate: string
  status: TrainerStatus
}

export interface AttendanceEntry {
  id: string
  trainerId: string
  date: string
  status: AttendanceStatus
}

export interface SessionEntry {
  id: string
  trainerId: string
  date: string
  title: string
  count: number
}

export interface PayrollAdjustment {
  id: string
  trainerId: string
  month: string
  label: string
  type: 'bonus' | 'deduction'
  amount: number
}

export interface PayrollEntry {
  id: string
  trainerId: string
  month: string
  baseAmount: number
  adjustmentAmount: number
  finalAmount: number
  status: PayrollStatus
  paidOn?: string
}

export interface TrainerDocument {
  id: string
  trainerId: string
  fileName: string
  mimeType: string
  sizeKb: number
  uploadedAt: string
  fileDataUrl?: string
}

export interface ReportFilters {
  trainerId: 'all' | string
  startDate: string
  endDate: string
}

export interface TrainerFormValues {
  name: string
  phone: string
  specialization: string
  salaryType: TrainerSalaryType
  salaryAmount: number
  joiningDate: string
}
