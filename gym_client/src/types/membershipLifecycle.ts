export type MembershipApprovalRequestType =
  | 'Void'
  | 'Cancel'
  | 'Edit'
  | 'DateChange'
  | 'PlanChange'
  | 'FeeChange'
  | 'Transfer'

export type MembershipApprovalRequestStatus = 'Pending' | 'Approved' | 'Rejected'

export type MembershipApprovalStatusFilter = 'Pending' | 'Approved' | 'Rejected' | 'All'

export interface MembershipApprovalRequest {
  id: number
  membershipId: number
  memberId: number
  memberName?: string | null
  memberPhotoUrl?: string | null
  memberCode?: string | null
  planName?: string | null
  membershipStartDate?: string | null
  membershipEndDate?: string | null
  requestType: MembershipApprovalRequestType
  status: MembershipApprovalRequestStatus
  reason: string
  requestedByUserId: number
  requestedByName?: string | null
  requestedDate: string
  approvedByUserId?: number | null
  approvedByName?: string | null
  approvedDate?: string | null
  rejectedByUserId?: number | null
  rejectedByName?: string | null
  rejectedDate?: string | null
  adminRemarks?: string | null
  hasPaymentRecords: boolean
  membershipFee?: number | null
  totalPaid?: number | null
  outstandingBalance?: number | null
  proposedChangesJson?: string | null
}

export interface CreateMembershipApprovalRequestDto {
  membershipId: number
  requestType: MembershipApprovalRequestType
  reason: string
  proposedChangesJson?: string | null
}
