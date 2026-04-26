import type {
  AttendanceEntry,
  PayrollAdjustment,
  PayrollEntry,
  SessionEntry,
  TrainerDocument,
  TrainerRecord,
} from './types'

export const seededTrainers: TrainerRecord[] = [
  {
    id: 'tr-1001',
    name: 'Riya Sharma',
    phone: '+91 9898989898',
    specialization: 'Strength & Conditioning',
    salaryType: 'fixed',
    salaryAmount: 45000,
    joiningDate: '2024-01-12',
    status: 'active',
  },
  {
    id: 'tr-1002',
    name: 'Aman Verma',
    phone: '+91 9777777777',
    specialization: 'Yoga & Mobility',
    salaryType: 'per_session',
    salaryAmount: 450,
    joiningDate: '2024-05-05',
    status: 'active',
  },
  {
    id: 'tr-1003',
    name: 'Neha Singh',
    phone: '+91 9666666666',
    specialization: 'Weight Loss',
    salaryType: 'fixed',
    salaryAmount: 40000,
    joiningDate: '2023-10-02',
    status: 'inactive',
  },
]

export const seededAttendance: AttendanceEntry[] = [
  { id: 'at-1', trainerId: 'tr-1001', date: '2026-04-25', status: 'present' },
  { id: 'at-2', trainerId: 'tr-1002', date: '2026-04-25', status: 'present' },
  { id: 'at-3', trainerId: 'tr-1003', date: '2026-04-25', status: 'absent' },
]

export const seededSessions: SessionEntry[] = [
  { id: 'ss-1', trainerId: 'tr-1001', date: '2026-04-24', title: 'Strength - Batch A', count: 2 },
  { id: 'ss-2', trainerId: 'tr-1002', date: '2026-04-24', title: 'Morning Yoga', count: 3 },
  { id: 'ss-3', trainerId: 'tr-1001', date: '2026-04-25', title: 'Fat Loss Camp', count: 1 },
]

export const seededAdjustments: PayrollAdjustment[] = [
  { id: 'adj-1', trainerId: 'tr-1001', month: '2026-04', label: 'Performance Bonus', type: 'bonus', amount: 3000 },
  { id: 'adj-2', trainerId: 'tr-1002', month: '2026-04', label: 'Late Penalty', type: 'deduction', amount: 600 },
]

export const seededPayrollHistory: PayrollEntry[] = [
  {
    id: 'pr-1',
    trainerId: 'tr-1001',
    month: '2026-03',
    baseAmount: 45000,
    adjustmentAmount: 0,
    finalAmount: 45000,
    status: 'paid',
    paidOn: '2026-04-01',
  },
]

export const seededDocuments: TrainerDocument[] = []
