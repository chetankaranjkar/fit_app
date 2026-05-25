export type PTPackageType = 'Monthly' | 'SessionBased' | 'Weekly' | 'Custom';
export type MemberPTPackageStatus = 'PendingPayment' | 'Active' | 'Frozen' | 'Expired' | 'Completed' | 'Cancelled' | 'Upgraded';
export type PTSessionStatus = 'Booked' | 'Completed' | 'Cancelled' | 'NoShow' | 'Rescheduled';
export type PTPaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Refunded';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PTPackage {
  id: number;
  packageName: string;
  description?: string;
  packageType: PTPackageType;
  totalSessions: number;
  validityDays: number;
  price: number;
  taxPercentage: number;
  defaultDiscountAmount: number;
  isActive: boolean;
  trainerPrices?: { id: number; trainerId: number; trainerName?: string; price: number; isActive: boolean }[];
}

export interface MemberPTPackage {
  id: number;
  userId: number;
  memberName?: string;
  trainerId: number;
  trainerName?: string;
  packageId: number;
  packageName?: string;
  totalSessions: number;
  remainingSessions: number;
  startDate: string;
  expiryDate: string;
  frozenUntil?: string;
  status: MemberPTPackageStatus;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PTPaymentStatus;
  invoiceNumber?: string;
}

export interface PTSession {
  id: number;
  memberPTPackageId: number;
  userId: number;
  memberName?: string;
  trainerId: number;
  trainerName?: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  status: PTSessionStatus;
  notes?: string;
  remainingSessions: number;
}

export interface TrainerSchedule {
  id: number;
  trainerId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  sessionDurationMinutes: number;
  maxSessionsPerDay: number;
  isActive: boolean;
}

export interface TrainerEarningsDashboard {
  totalSessions: number;
  sessionsCompleted: number;
  activeClients: number;
  monthlyEarnings: number;
  pendingCommissions: number;
  attendancePercent: number;
  topPackagesSold: { packageName: string; count: number; revenue: number }[];
  monthlySessionTrend: { year: number; month: number; value: number }[];
  monthlyRevenueTrend: { year: number; month: number; value: number }[];
}

export interface PTNotification {
  id: number;
  notificationType: string;
  title: string;
  body?: string;
  isRead: boolean;
  scheduledForUtc?: string;
  createdDate: string;
}
