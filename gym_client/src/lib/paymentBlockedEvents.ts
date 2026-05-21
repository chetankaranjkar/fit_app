const BLOCK_EVENT = 'gym:payment-blocked'

export type PaymentBlockedDetail = {
  pendingAmount?: number
  dueDate?: string
  message?: string
}

export function dispatchPaymentBlocked(detail: PaymentBlockedDetail) {
  window.dispatchEvent(new CustomEvent(BLOCK_EVENT, { detail }))
}

export function subscribePaymentBlocked(handler: (detail: PaymentBlockedDetail) => void) {
  const fn = (e: Event) => handler((e as CustomEvent<PaymentBlockedDetail>).detail ?? {})
  window.addEventListener(BLOCK_EVENT, fn)
  return () => window.removeEventListener(BLOCK_EVENT, fn)
}

export { BLOCK_EVENT }
