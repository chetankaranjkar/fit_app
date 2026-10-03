import { useCallback, useEffect, useRef, useState } from 'react'
import {
  commercialService,
  type OnlinePaymentAttemptStatus,
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

/** completed = recorded; confirming = money may be captured, server is still confirming (never shown as a failure). */
export type OnlinePaymentOutcomeKind = 'completed' | 'confirming' | 'review' | 'cancelled' | 'failed' | 'pending'

export type OnlinePaymentOutcome = {
  kind: OnlinePaymentOutcomeKind
  message: string
  orderId: string
}

export function outcomeKindFromStatus(status: OnlinePaymentAttemptStatus): OnlinePaymentOutcomeKind {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'pending_verification':
    case 'processing':
      return 'confirming'
    case 'review_required':
      return 'review'
    case 'cancelled':
      return 'cancelled'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}

const CONFIRMING_MESSAGE = 'Payment received, confirming with the bank. This usually takes under a minute.'
const CANCELLED_MESSAGE = 'Checkout closed. No payment was completed.'

type CheckoutResult = { type: 'paid'; payload: RazorpayVerifyPayload } | { type: 'dismissed' }

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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useRazorpayCheckout() {
  const [loadingScript, setLoadingScript] = useState(false)
  const inFlight = useRef<Promise<OnlinePaymentOutcome> | null>(null)

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

  const openCheckout = useCallback(async (order: RazorpayOrderResponse): Promise<CheckoutResult> => {
    await loadRazorpayScript()
    if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable.')

    return new Promise((resolve) => {
      // Checkout can fire handler/ondismiss more than once (retries, UPI intent returns); only the first counts.
      let settled = false
      const settle = (result: CheckoutResult) => {
        if (settled) return
        settled = true
        resolve(result)
      }
      const checkout = new window.Razorpay!({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: order.businessName,
        description: 'Outstanding membership balance',
        order_id: order.orderId,
        prefill: {
          name: order.memberName ?? undefined,
          email: order.memberEmail ?? undefined,
          contact: order.memberPhone ?? undefined,
        },
        theme: { color: '#F5C400' },
        handler: (response) =>
          settle({
            type: 'paid',
            payload: {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
          }),
        modal: { ondismiss: () => settle({ type: 'dismissed' }) },
      })
      checkout.open()
    })
  }, [])

  const checkStatus = useCallback(async (orderId: string): Promise<OnlinePaymentOutcome> => {
    const { data } = await commercialService.getRazorpayOrderStatus(orderId)
    return { kind: outcomeKindFromStatus(data.status), message: data.message, orderId }
  }, [])

  /** Polls the server (which re-checks Razorpay) until the attempt leaves the confirming state. */
  const waitForConfirmation = useCallback(
    async (orderId: string, attempts = 5): Promise<OnlinePaymentOutcome> => {
      let last: OnlinePaymentOutcome = { kind: 'confirming', message: CONFIRMING_MESSAGE, orderId }
      for (let i = 0; i < attempts; i += 1) {
        await wait(2000 + i * 2000)
        try {
          last = await checkStatus(orderId)
        } catch {
          continue
        }
        if (last.kind !== 'confirming') return last
      }
      return last
    },
    [checkStatus],
  )

  const runPayment = useCallback(
    async (membershipPaymentId?: number): Promise<OnlinePaymentOutcome> => {
      const { data: order } = await commercialService.createRazorpayOrder(membershipPaymentId)
      const result = await openCheckout(order)

      if (result.type === 'dismissed') {
        try {
          const { data } = await commercialService.cancelRazorpayOrder(order.orderId)
          const kind = outcomeKindFromStatus(data.status)
          if (kind !== 'cancelled' && kind !== 'pending') return { kind, message: data.message, orderId: order.orderId }
        } catch {
          /* cancellation is best-effort; the server reconciles the attempt either way */
        }
        return { kind: 'cancelled', message: CANCELLED_MESSAGE, orderId: order.orderId }
      }

      try {
        const { data } = await commercialService.verifyRazorpayPayment(result.payload)
        return { kind: outcomeKindFromStatus(data.status), message: data.message, orderId: order.orderId }
      } catch {
        // Checkout reported success; the server confirms with Razorpay (status check, webhook, sweep).
        return { kind: 'confirming', message: CONFIRMING_MESSAGE, orderId: order.orderId }
      }
    },
    [openCheckout],
  )

  /** Settles the outstanding balance of an existing bill. Concurrent calls share the open checkout. */
  const payMembership = useCallback(
    (membershipPaymentId?: number): Promise<OnlinePaymentOutcome> => {
      if (inFlight.current) return inFlight.current
      const run = runPayment(membershipPaymentId).finally(() => {
        inFlight.current = null
      })
      inFlight.current = run
      return run
    },
    [runPayment],
  )

  return { loadingScript, openCheckout, payMembership, checkStatus, waitForConfirmation }
}
