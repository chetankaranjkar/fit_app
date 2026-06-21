import { useCallback, useEffect, useState } from 'react'
import {
  commercialService,
  type RazorpayOrderResponse,
  type RazorpayVerifyPayload,
} from '../../services/commercial.service'

type RazorpayHandlerResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayCheckoutOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: { color?: string }
  handler: (response: RazorpayHandlerResponse) => void
  modal?: { ondismiss?: () => void }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void }
  }
}

const SCRIPT_ID = 'razorpay-checkout-js'
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser only'))
  if (window.Razorpay) return Promise.resolve()
  const existing = document.getElementById(SCRIPT_ID)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay')), { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay checkout'))
    document.body.appendChild(script)
  })
}

export function useRazorpayCheckout() {
  const [loadingScript, setLoadingScript] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingScript(true)
    loadRazorpayScript()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingScript(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openCheckout = useCallback(
    async (order: RazorpayOrderResponse): Promise<RazorpayVerifyPayload> => {
      await loadRazorpayScript()
      if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable.')

      return new Promise((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: order.keyId,
          amount: order.amountPaise,
          currency: order.currency,
          name: order.businessName,
          description: 'Membership payment',
          order_id: order.orderId,
          prefill: {
            name: order.memberName ?? undefined,
            email: order.memberEmail ?? undefined,
            contact: order.memberPhone ?? undefined,
          },
          theme: { color: '#F5C400' },
          handler: (response) => {
            resolve({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })
        checkout.open()
      })
    },
    [],
  )

  const payMembership = useCallback(
    async (membershipPaymentId?: number) => {
      const { data: order } = await commercialService.createRazorpayOrder(membershipPaymentId)
      const verified = await openCheckout(order)
      const { data: result } = await commercialService.verifyRazorpayPayment(verified)
      return result
    },
    [openCheckout],
  )

  return { loadingScript, openCheckout, payMembership }
}
