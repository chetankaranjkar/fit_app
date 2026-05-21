import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { couponsService } from '../../services/coupons.service'
import { formatInr } from '../../lib/formatInr'
import { getApiErrorMessage } from '../../lib/apiErrors'
import type { ValidateCouponResponse } from '../../types/coupon'

interface ApplyCouponProps {
  membershipPlanId: number
  invoiceAmount: number
  userId: number
  branchId?: number | null
  onApplied: (result: ValidateCouponResponse) => void
  onRemoved: () => void
  appliedCoupon?: ValidateCouponResponse | null
  disabled?: boolean
}

export function ApplyCoupon({
  membershipPlanId,
  invoiceAmount,
  userId,
  branchId,
  onApplied,
  onRemoved,
  appliedCoupon,
  disabled,
}: ApplyCouponProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const validateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await couponsService.validate({
        couponCode: code.trim().toUpperCase(),
        membershipPlanId,
        invoiceAmount,
        userId,
        branchId: branchId ?? undefined,
      })
      return data
    },
    onSuccess: (data) => {
      if (data.valid) {
        setError(null)
        onApplied(data)
      } else {
        setError(data.message)
      }
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Failed to validate coupon')),
  })

  const handleApply = () => {
    setError(null)
    if (!code.trim()) {
      setError('Enter a coupon code.')
      return
    }
    validateMutation.mutate()
  }

  const handleRemove = () => {
    setCode('')
    setError(null)
    onRemoved()
  }

  if (appliedCoupon?.valid) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-100">Coupon Applied Successfully</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Code: <span className="font-mono font-bold">{appliedCoupon.couponCode}</span>
            </p>
            <p className="text-xs text-emerald-200/80">
              Discount: <span className="font-semibold">{formatInr(appliedCoupon.discountAmount)}</span>
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
        Apply Coupon
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          disabled={disabled}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-mono text-slate-100 uppercase placeholder-slate-500 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleApply()
            }
          }}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || validateMutation.isPending || !code.trim()}
          className="rounded-xl border border-blue-400/40 bg-blue-500/15 px-4 py-2.5 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {validateMutation.isPending ? 'Checking…' : 'Apply'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-rose-300">{error}</p>
      )}
    </div>
  )
}
