import type {
  Locker,
  LockerAccessLog,
  LockerAssignment,
  LockerMaintenance,
} from '../types'

const iso = (offsetDays: number, hoursOffset = 0): string => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(d.getHours() + hoursOffset)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Lockers
// ---------------------------------------------------------------------------

export const MOCK_LOCKERS: Locker[] = [
  { id: 'lk-001', lockerNumber: 'A-101', size: 'Small', status: 'AVAILABLE', location: 'Men\u2019s Changing Room' },
  { id: 'lk-002', lockerNumber: 'A-102', size: 'Medium', status: 'OCCUPIED', location: 'Men\u2019s Changing Room' },
  { id: 'lk-003', lockerNumber: 'A-103', size: 'Medium', status: 'OCCUPIED', location: 'Men\u2019s Changing Room' },
  { id: 'lk-004', lockerNumber: 'A-104', size: 'Large', status: 'MAINTENANCE', location: 'Men\u2019s Changing Room' },
  { id: 'lk-005', lockerNumber: 'A-105', size: 'Small', status: 'AVAILABLE', location: 'Men\u2019s Changing Room' },
  { id: 'lk-006', lockerNumber: 'B-201', size: 'Small', status: 'AVAILABLE', location: 'Women\u2019s Changing Room' },
  { id: 'lk-007', lockerNumber: 'B-202', size: 'Medium', status: 'OCCUPIED', location: 'Women\u2019s Changing Room' },
  { id: 'lk-008', lockerNumber: 'B-203', size: 'Large', status: 'OCCUPIED', location: 'Women\u2019s Changing Room' },
  { id: 'lk-009', lockerNumber: 'B-204', size: 'Medium', status: 'AVAILABLE', location: 'Women\u2019s Changing Room' },
  { id: 'lk-010', lockerNumber: 'B-205', size: 'Large', status: 'MAINTENANCE', location: 'Women\u2019s Changing Room' },
  { id: 'lk-011', lockerNumber: 'C-301', size: 'Small', status: 'AVAILABLE', location: 'Premium Lounge' },
  { id: 'lk-012', lockerNumber: 'C-302', size: 'Large', status: 'OCCUPIED', location: 'Premium Lounge' },
]

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export const MOCK_ASSIGNMENTS: LockerAssignment[] = [
  {
    id: 'as-001',
    lockerId: 'lk-002',
    lockerNumber: 'A-102',
    memberName: 'Rahul Sharma',
    assignedDate: iso(-30),
    expiryDate: iso(60),
  },
  {
    id: 'as-002',
    lockerId: 'lk-003',
    lockerNumber: 'A-103',
    memberName: 'Amit Verma',
    assignedDate: iso(-10),
    expiryDate: iso(5),
  },
  {
    id: 'as-003',
    lockerId: 'lk-007',
    lockerNumber: 'B-202',
    memberName: 'Priya Nair',
    assignedDate: iso(-90),
    expiryDate: iso(-5), // Expired
  },
  {
    id: 'as-004',
    lockerId: 'lk-008',
    lockerNumber: 'B-203',
    memberName: 'Neha Gupta',
    assignedDate: iso(-45),
    expiryDate: iso(45),
  },
  {
    id: 'as-005',
    lockerId: 'lk-012',
    lockerNumber: 'C-302',
    memberName: 'Vikram Singh',
    assignedDate: iso(-120),
    expiryDate: iso(-15), // Expired
  },
]

// ---------------------------------------------------------------------------
// Access logs (newest first)
// ---------------------------------------------------------------------------

export const MOCK_ACCESS_LOGS: LockerAccessLog[] = [
  { id: 'al-001', lockerId: 'lk-002', lockerNumber: 'A-102', memberName: 'Rahul Sharma', action: 'OPEN', accessTime: iso(0, -1) },
  { id: 'al-002', lockerId: 'lk-002', lockerNumber: 'A-102', memberName: 'Rahul Sharma', action: 'CLOSE', accessTime: iso(0, -3) },
  { id: 'al-003', lockerId: 'lk-007', lockerNumber: 'B-202', memberName: 'Priya Nair', action: 'OPEN', accessTime: iso(0, -5) },
  { id: 'al-004', lockerId: 'lk-008', lockerNumber: 'B-203', memberName: 'Neha Gupta', action: 'CLOSE', accessTime: iso(0, -6) },
  { id: 'al-005', lockerId: 'lk-003', lockerNumber: 'A-103', memberName: 'Amit Verma', action: 'OPEN', accessTime: iso(-1, -2) },
  { id: 'al-006', lockerId: 'lk-012', lockerNumber: 'C-302', memberName: 'Vikram Singh', action: 'CLOSE', accessTime: iso(-1, -4) },
  { id: 'al-007', lockerId: 'lk-002', lockerNumber: 'A-102', memberName: 'Rahul Sharma', action: 'OPEN', accessTime: iso(-1, -8) },
  { id: 'al-008', lockerId: 'lk-007', lockerNumber: 'B-202', memberName: 'Priya Nair', action: 'CLOSE', accessTime: iso(-2, -1) },
]

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export const MOCK_MAINTENANCE: LockerMaintenance[] = [
  {
    id: 'mt-001',
    lockerId: 'lk-004',
    lockerNumber: 'A-104',
    issue: 'Door latch not closing properly.',
    reportedDate: iso(-3),
    status: 'PENDING',
  },
  {
    id: 'mt-002',
    lockerId: 'lk-010',
    lockerNumber: 'B-205',
    issue: 'Key jammed; replacement lock required.',
    reportedDate: iso(-7),
    status: 'PENDING',
  },
  {
    id: 'mt-003',
    lockerId: 'lk-002',
    lockerNumber: 'A-102',
    issue: 'Cosmetic dent on front panel.',
    reportedDate: iso(-21),
    status: 'FIXED',
  },
]
