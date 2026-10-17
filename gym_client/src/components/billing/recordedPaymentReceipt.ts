import { membershipPaymentsService } from '../../services/membershipPayments.service'
import type { MembershipPaymentDetail } from '../../types/membershipPayment'
import { findRecordedTransaction } from './membershipPaymentUi'
import type { PaymentReceiptData } from './PaymentReceiptModal'

/** Build the same installment receipt for every collection entry point. */
export async function recordedPaymentReceipt(
  bill: MembershipPaymentDetail,
  priorIds: ReadonlySet<number>,
  member: { name?: string | null; code?: string | null; photoUrl?: string | null },
): Promise<PaymentReceiptData | null> {
  const transaction = findRecordedTransaction(bill.transactions ?? [], priorIds)
  if (!transaction) return null
  const row = await membershipPaymentsService.listTransactions({ userId: bill.userId })
    .then(({ data }) => data.find((item) => item.id === transaction.id))
    .catch(() => undefined)
  return {
    transactionId: transaction.id,
    userId: bill.userId,
    receiptNumber: transaction.receiptNumber ?? `#${transaction.id}`,
    memberName: row?.memberName ?? member.name ?? 'Member',
    memberId: member.code ?? `M-${String(bill.userId).padStart(5, '0')}`,
    memberPhotoUrl: row?.memberPhotoUrl ?? member.photoUrl,
    planName: bill.planName,
    amountPaid: transaction.transactionAmount,
    paymentMethod: transaction.transactionMethod,
    remainingBalance: bill.pendingAmount,
    paymentDate: transaction.transactionDate,
    receiveEmailNotifications: row?.receiveEmailNotifications ?? false,
    receiveSmsNotifications: row?.receiveSmsNotifications ?? false,
  }
}
