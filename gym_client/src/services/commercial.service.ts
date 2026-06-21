import { api } from '../lib/api'
import type { LoginResponse } from '../types/auth'

export type PublicCommercialConfig = {
  enableSelfSignup: boolean
  enableOnlinePayments: boolean
  razorpayKeyId?: string | null
  checkoutBusinessName: string
}

export type PublicMembershipPlan = {
  id: number
  planName: string
  durationDays: number
  price: number
  description?: string | null
}

export type PublicSignupPayload = {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  planId: number
  dateOfBirth?: string
  gender?: string
}

export type PublicSignupResult = {
  member: {
    id: number
    openMembershipPaymentId?: number | null
    pendingPaymentAmount?: number | null
  }
  session?: LoginResponse | null
  openMembershipPaymentId?: number | null
  pendingAmount?: number | null
}

export type RazorpayOrderResponse = {
  orderId: string
  keyId: string
  amountPaise: number
  amount: number
  currency: string
  membershipPaymentId: number
  businessName: string
  memberEmail?: string | null
  memberPhone?: string | null
  memberName?: string | null
}

export type RazorpayVerifyPayload = {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export type RazorpayVerifyResponse = {
  success: boolean
  message: string
}

export type MemberBillingAccess = {
  accessBlocked: boolean
  pendingAmount?: number | null
  nextDueDate?: string | null
  message?: string | null
  membershipPaymentId?: number | null
}

export const commercialService = {
  getConfig: () => api.get<PublicCommercialConfig>('/public/config'),
  getPlans: () => api.get<PublicMembershipPlan[]>('/public/membership-plans'),
  signup: (payload: PublicSignupPayload) => api.post<PublicSignupResult>('/public/signup', payload),
  getBillingAccess: () => api.get<MemberBillingAccess>('/me/membership-billing/access'),
  createRazorpayOrder: (membershipPaymentId?: number) =>
    api.post<RazorpayOrderResponse>('/me/payments/razorpay/order', {
      membershipPaymentId: membershipPaymentId ?? undefined,
    }),
  verifyRazorpayPayment: (payload: RazorpayVerifyPayload) =>
    api.post<RazorpayVerifyResponse>('/me/payments/razorpay/verify', payload),
}
