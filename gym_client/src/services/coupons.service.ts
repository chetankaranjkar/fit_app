import { api } from '../lib/api'
import type {
  Coupon,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponRequest,
  ValidateCouponResponse,
  CouponUsage,
  CouponAnalytics,
} from '../types/coupon'

export const couponsService = {
  getAll: (params?: { search?: string; status?: string }) =>
    api.get<Coupon[]>('/Coupons', { params }),

  getById: (id: number) => api.get<Coupon>(`/Coupons/${id}`),

  create: (dto: CreateCouponDto) => api.post<Coupon>('/Coupons', dto),

  update: (id: number, dto: UpdateCouponDto) => api.put<Coupon>(`/Coupons/${id}`, dto),

  disable: (id: number) => api.delete(`/Coupons/${id}`),

  validate: (dto: ValidateCouponRequest) =>
    api.post<ValidateCouponResponse>('/Coupons/validate', dto),

  getUsages: (couponId: number) => api.get<CouponUsage[]>(`/Coupons/${couponId}/usages`),

  getAnalytics: () => api.get<CouponAnalytics>('/Coupons/analytics'),
}
