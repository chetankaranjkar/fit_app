export type PaymentMode = 'Cash' | 'Upi' | 'Card'

export interface Payment {
  id: number
  membershipId: number
  amount: number
  paymentDate: string
  paymentMode: PaymentMode
  receiptNo?: string | null
  /** Paid invoice/receipt generated for this transaction */
  invoiceId?: number | null
}

export interface CreatePaymentDto {
  membershipId: number
  amount: number
  paymentDate: string
  paymentMode: PaymentMode
  receiptNo?: string | null
}

export interface UpdatePaymentDto {
  amount?: number | null
  paymentDate?: string | null
  paymentMode?: PaymentMode | null
  receiptNo?: string | null
}
