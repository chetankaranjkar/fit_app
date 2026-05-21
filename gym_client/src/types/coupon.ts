export type DiscountType = 'Percentage' | 'Fixed'
export type CouponStatus = 'Active' | 'Expired' | 'Disabled'

export interface Coupon {
  id: number
  couponCode: string
  couponName: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  minimumInvoiceAmount: number
  maximumDiscountAmount?: number | null
  validFrom: string
  validTo: string
  usageLimit: number
  usedCount: number
  perUserLimit: number
  applicableMembershipIds?: number[] | null
  applicableBranchIds?: number[] | null
  applicableUserTypes?: string[] | null
  status: CouponStatus
  createdByUserId?: number | null
  createdByName?: string | null
  createdDate: string
  updatedDate?: string | null
}

export interface CreateCouponDto {
  couponCode: string
  couponName: string
  description?: string
  discountType: DiscountType
  discountValue: number
  minimumInvoiceAmount: number
  maximumDiscountAmount?: number | null
  validFrom: string
  validTo: string
  usageLimit: number
  perUserLimit: number
  applicableMembershipIds?: number[]
  applicableBranchIds?: number[]
  applicableUserTypes?: string[]
}

export interface UpdateCouponDto {
  couponName?: string
  description?: string
  discountType?: DiscountType
  discountValue?: number
  minimumInvoiceAmount?: number
  maximumDiscountAmount?: number | null
  validFrom?: string
  validTo?: string
  usageLimit?: number
  perUserLimit?: number
  applicableMembershipIds?: number[]
  applicableBranchIds?: number[]
  applicableUserTypes?: string[]
  status?: CouponStatus
}

export interface ValidateCouponRequest {
  couponCode: string
  membershipPlanId: number
  invoiceAmount: number
  userId: number
  branchId?: number | null
  membershipPaymentId?: number
}

export interface ValidateCouponResponse {
  valid: boolean
  discountAmount: number
  finalAmount: number
  message: string
  couponId?: number | null
  couponCode?: string | null
}

export interface CouponUsage {
  id: number
  couponId: number
  couponCode: string
  userId: number
  userName?: string | null
  membershipPaymentId: number
  invoiceId?: number | null
  discountAmount: number
  usedAt: string
}

export interface CouponAnalytics {
  activeCoupons: number
  expiredCoupons: number
  disabledCoupons: number
  totalDiscountGiven: number
  mostUsedCoupon?: Coupon | null
  revenueImpact: number
  revenueAfterDiscount?: number
  couponConversionRate?: number
}
