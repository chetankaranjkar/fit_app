import { useRef } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatInr } from '../../lib/formatInr'
import type { MembershipPaymentMethod } from '../../types/membershipPayment'

export interface PaymentReceiptData {
  receiptNumber: string
  memberName: string
  memberId: string
  memberPhotoUrl?: string | null
  planName?: string | null
  amountPaid: number
  paymentMethod: MembershipPaymentMethod
  remainingBalance: number
  paymentDate: string
}

export function PaymentReceiptModal({
  open,
  onClose,
  receipt,
  onDownloadPdf,
  downloading,
}: {
  open: boolean
  onClose: () => void
  receipt: PaymentReceiptData | null
  onDownloadPdf?: () => void
  downloading?: boolean
}) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!receipt) return null

  const whatsappText = encodeURIComponent(
    `Payment receipt ${receipt.receiptNumber}\nMember: ${receipt.memberName}\nAmount: ${formatInr(receipt.amountPaid)}\nRemaining: ${formatInr(receipt.remainingBalance)}`,
  )
  const mailSubject = encodeURIComponent(`Receipt ${receipt.receiptNumber}`)
  const mailBody = encodeURIComponent(
    `Receipt: ${receipt.receiptNumber}\nMember: ${receipt.memberName}\nAmount paid: ${formatInr(receipt.amountPaid)}\nRemaining balance: ${formatInr(receipt.remainingBalance)}`,
  )

  function handlePrint() {
    const el = printRef.current
    if (!el) return
    const w = window.open('', '_blank', 'noopener')
    if (!w) return
    w.document.write(`<html><head><title>Receipt ${receipt.receiptNumber}</title></head><body>${el.innerHTML}</body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <Modal open={open} onClose={onClose} title="Payment receipt" size="md">
      <div ref={printRef} className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
        <p className="font-mono text-xs text-slate-400">Receipt #{receipt.receiptNumber}</p>
        <div className="flex items-center gap-3">
          {receipt.memberPhotoUrl ? (
            <img src={receipt.memberPhotoUrl} alt="" className="size-12 rounded-full object-cover" />
          ) : null}
          <div>
            <p className="font-semibold text-white">{receipt.memberName}</p>
            <p className="text-slate-400">{receipt.memberId}</p>
          </div>
        </div>
        {receipt.planName && <p>Plan: {receipt.planName}</p>}
        <p>Amount paid: <strong>{formatInr(receipt.amountPaid)}</strong></p>
        <p>Method: {receipt.paymentMethod}</p>
        <p>Remaining balance: {formatInr(receipt.remainingBalance)}</p>
        <p>Date: {new Date(receipt.paymentDate).toLocaleString()}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={handlePrint}>
          Print receipt
        </Button>
        {onDownloadPdf && (
          <Button type="button" variant="secondary" onClick={onDownloadPdf} disabled={downloading}>
            Download PDF
          </Button>
        )}
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm text-emerald-300 hover:bg-white/5"
        >
          Share on WhatsApp
        </a>
        <a
          href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
          className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          Email receipt
        </a>
        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
