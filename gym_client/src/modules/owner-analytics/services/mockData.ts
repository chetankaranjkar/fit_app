/**
 * Owner Analytics \u2014 deterministic mock data scoped to this module only.
 *
 * All dates are generated relative to "today" so the drill-downs feel fresh
 * without needing a backend. Amounts are in INR.
 */

import type {
  ActiveMember,
  EquipmentIssue,
  PaymentEntry,
  PendingDue,
  RevenuePoint,
} from '../types'

const today = new Date()
today.setHours(9, 0, 0, 0)

const daysAgo = (n: number, hour = 10, minute = 0) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Payments (used by Revenue + Pending drawers)
// ---------------------------------------------------------------------------

export const MOCK_PAYMENTS: PaymentEntry[] = [
  { id: 'p-01', memberName: 'Rahul Sharma',   plan: 'Gold Quarterly',  amount: 7500,  date: daysAgo(0, 11, 20), status: 'PAID' },
  { id: 'p-02', memberName: 'Priya Verma',    plan: 'Silver Monthly',  amount: 2500,  date: daysAgo(0, 12, 45), status: 'PAID' },
  { id: 'p-03', memberName: 'Amit Singh',     plan: 'Gold Annual',     amount: 28000, date: daysAgo(1, 9, 15),  status: 'PAID' },
  { id: 'p-04', memberName: 'Neha Iyer',      plan: 'Silver Quarterly', amount: 6500, date: daysAgo(1, 14, 5),  status: 'PENDING' },
  { id: 'p-05', memberName: 'Vikram Patel',   plan: 'Gold Monthly',    amount: 3500,  date: daysAgo(2, 10, 30), status: 'PAID' },
  { id: 'p-06', memberName: 'Anjali Nair',    plan: 'Platinum Annual', amount: 36000, date: daysAgo(2, 15, 45), status: 'PAID' },
  { id: 'p-07', memberName: 'Rohit Kapoor',   plan: 'Silver Monthly',  amount: 2500,  date: daysAgo(3, 11, 10), status: 'PAID' },
  { id: 'p-08', memberName: 'Sneha Rao',      plan: 'Gold Monthly',    amount: 3500,  date: daysAgo(3, 18, 20), status: 'REFUNDED' },
  { id: 'p-09', memberName: 'Kiran Desai',    plan: 'Gold Quarterly',  amount: 7500,  date: daysAgo(4, 10, 0),  status: 'PAID' },
  { id: 'p-10', memberName: 'Manish Jain',    plan: 'Silver Monthly',  amount: 2500,  date: daysAgo(5, 13, 30), status: 'PAID' },
  { id: 'p-11', memberName: 'Aditi Reddy',    plan: 'Platinum Monthly',amount: 5500,  date: daysAgo(6, 16, 45), status: 'PAID' },
  { id: 'p-12', memberName: 'Sanjay Gupta',   plan: 'Gold Annual',     amount: 28000, date: daysAgo(7, 9, 0),   status: 'PAID' },
]

// ---------------------------------------------------------------------------
// Pending dues
// ---------------------------------------------------------------------------

export const MOCK_PENDING: PendingDue[] = [
  { id: 'd-01', memberName: 'Neha Iyer',      plan: 'Silver Quarterly', dueAmount: 6500, dueDate: daysAgo(-3),  remindersSent: 0 },
  { id: 'd-02', memberName: 'Arjun Bhatia',   plan: 'Gold Monthly',     dueAmount: 3500, dueDate: daysAgo(2),   remindersSent: 1 },
  { id: 'd-03', memberName: 'Kavita Menon',   plan: 'Silver Monthly',   dueAmount: 2500, dueDate: daysAgo(5),   remindersSent: 2 },
  { id: 'd-04', memberName: 'Siddharth Khanna',plan: 'Platinum Monthly',dueAmount: 5500, dueDate: daysAgo(-1),  remindersSent: 0 },
  { id: 'd-05', memberName: 'Divya Shetty',   plan: 'Gold Monthly',     dueAmount: 3500, dueDate: daysAgo(9),   remindersSent: 3 },
  { id: 'd-06', memberName: 'Rajesh Rao',     plan: 'Gold Quarterly',   dueAmount: 7500, dueDate: daysAgo(14),  remindersSent: 3 },
  { id: 'd-07', memberName: 'Pooja Sen',      plan: 'Silver Monthly',   dueAmount: 2500, dueDate: daysAgo(-7),  remindersSent: 0 },
]

// ---------------------------------------------------------------------------
// Members (active / inactive)
// ---------------------------------------------------------------------------

function mockMember(
  id: string,
  name: string,
  plan: string,
  lastVisit: string,
  hasActiveMembership: boolean,
): ActiveMember {
  const recentlyEngaged =
    (Date.now() - new Date(lastVisit).getTime()) / 86400000 <= 7
  return {
    id,
    name,
    plan,
    lastVisit,
    hasActiveMembership,
    recentlyEngaged,
    status: hasActiveMembership ? 'ACTIVE' : 'INACTIVE',
  }
}

export const MOCK_MEMBERS: ActiveMember[] = [
  mockMember('m-01', 'Rahul Sharma', 'Gold Quarterly', daysAgo(0, 7, 30), true),
  mockMember('m-02', 'Priya Verma', 'Silver Monthly', daysAgo(1, 19, 15), true),
  mockMember('m-03', 'Amit Singh', 'Gold Annual', daysAgo(0, 6, 45), true),
  mockMember('m-04', 'Anjali Nair', 'Platinum Annual', daysAgo(2, 20, 0), true),
  mockMember('m-05', 'Vikram Patel', 'Gold Monthly', daysAgo(3, 18, 30), true),
  mockMember('m-06', 'Sneha Rao', 'Gold Monthly', daysAgo(9, 8, 20), false),
  mockMember('m-07', 'Rohit Kapoor', 'Silver Monthly', daysAgo(12, 17, 10), false),
  mockMember('m-08', 'Kiran Desai', 'Gold Quarterly', daysAgo(4, 7, 50), true),
  mockMember('m-09', 'Manish Jain', 'Silver Monthly', daysAgo(6, 18, 5), true),
  mockMember('m-10', 'Aditi Reddy', 'Platinum Monthly', daysAgo(1, 6, 30), true),
  mockMember('m-11', 'Divya Shetty', 'Gold Monthly', daysAgo(15, 19, 0), false),
  mockMember('m-12', 'Pooja Sen', 'Silver Monthly', daysAgo(20, 20, 15), false),
]

// ---------------------------------------------------------------------------
// Equipment downtime
// ---------------------------------------------------------------------------

export const MOCK_EQUIPMENT_ISSUES: EquipmentIssue[] = [
  {
    id: 'e-01',
    equipmentName: 'Treadmill T-07',
    location: 'Cardio Zone',
    issue: 'Display panel flickering intermittently',
    status: 'OUT_OF_ORDER',
    reportedDate: daysAgo(9),
  },
  {
    id: 'e-02',
    equipmentName: 'Leg Press LP-03',
    location: 'Strength Zone',
    issue: 'Hydraulic resistance inconsistent',
    status: 'UNDER_MAINTENANCE',
    reportedDate: daysAgo(5),
  },
  {
    id: 'e-03',
    equipmentName: 'Spin Bike SB-12',
    location: 'Studio',
    issue: 'Pedal crank loose, safety concern',
    status: 'OUT_OF_ORDER',
    reportedDate: daysAgo(14),
  },
  {
    id: 'e-04',
    equipmentName: 'Cable Machine CM-02',
    location: 'Strength Zone',
    issue: 'Cable frayed near the pulley',
    status: 'UNDER_MAINTENANCE',
    reportedDate: daysAgo(2),
  },
  {
    id: 'e-05',
    equipmentName: 'Rowing Machine RM-04',
    location: 'Cardio Zone',
    issue: 'Seat rail alignment',
    status: 'RESOLVED',
    reportedDate: daysAgo(20),
    resolvedDate: daysAgo(1),
  },
]

// ---------------------------------------------------------------------------
// Revenue points (last 30 days)
// ---------------------------------------------------------------------------

export const MOCK_REVENUE_30D: RevenuePoint[] = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date(today)
  d.setDate(d.getDate() - (29 - i))
  // Seeded pseudo-wave so the chart looks organic but stable across reloads.
  const seed = (i + 3) * 9301 + 49297
  const noise = (seed % 233280) / 233280
  const base = 4000 + Math.sin(i / 3) * 1400 + Math.cos(i / 7) * 900
  const weekend = d.getDay() === 0 || d.getDay() === 6 ? 1500 : 0
  const amount = Math.max(1200, Math.round(base + weekend + noise * 2200))
  return { date: d.toISOString().slice(0, 10), amount }
})

// ---------------------------------------------------------------------------
// Pre-computed KPI snapshot (used by the main page tiles)
// ---------------------------------------------------------------------------

const last7 = MOCK_REVENUE_30D.slice(-7).reduce((sum, p) => sum + p.amount, 0)
const prev7 = MOCK_REVENUE_30D.slice(-14, -7).reduce((sum, p) => sum + p.amount, 0)
const total30 = MOCK_REVENUE_30D.reduce((sum, p) => sum + p.amount, 0)

const activeMemberCount = MOCK_MEMBERS.filter((m) => m.hasActiveMembership).length
const recentlyEngagedCount = MOCK_MEMBERS.filter((m) => m.recentlyEngaged).length
const totalMemberCount = MOCK_MEMBERS.length

const pendingCount = MOCK_PENDING.length
const pendingAmount = MOCK_PENDING.reduce((sum, d) => sum + d.dueAmount, 0)

const downCount = MOCK_EQUIPMENT_ISSUES.filter((e) => e.status !== 'RESOLVED').length
const longestDown = MOCK_EQUIPMENT_ISSUES.filter((e) => e.status !== 'RESOLVED').reduce(
  (max, e) => {
    const days = Math.floor((Date.now() - new Date(e.reportedDate).getTime()) / 86400000)
    return Math.max(max, days)
  },
  0,
)

export const KPI_SNAPSHOT = {
  revenue: {
    total30d: total30,
    last7d: last7,
    prev7d: prev7,
    deltaPct: prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0,
  },
  members: {
    active: activeMemberCount,
    total: totalMemberCount,
    inactive: totalMemberCount - activeMemberCount,
    recentlyEngaged: recentlyEngagedCount,
  },
  payments: {
    pendingCount,
    pendingAmount,
    overdueCount: MOCK_PENDING.filter((d) => new Date(d.dueDate) < new Date()).length,
  },
  equipment: {
    downCount,
    longestDown,
    resolvedThisMonth: MOCK_EQUIPMENT_ISSUES.filter((e) => e.status === 'RESOLVED').length,
  },
}
