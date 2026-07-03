import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatInr } from '../../lib/formatInr'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { usersService } from '../../services/users.service'
import type { MembershipPaymentMethod } from '../../types/membershipPayment'
import type { GymBranding } from '../../types/gymBranding'

export interface PaymentReceiptData {
  transactionId: number
  userId: number
  receiptNumber: string
  memberName: string
  memberId: string
  memberPhotoUrl?: string | null
  planName?: string | null
  amountPaid: number
  paymentMethod: MembershipPaymentMethod
  remainingBalance: number
  paymentDate: string
  receiveEmailNotifications?: boolean
  receiveSmsNotifications?: boolean
}

function resolveAssetUrl(url?: string | null) {
  if (!url?.trim()) return null
  const trimmed = url.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:'))
    return trimmed
  if (typeof window !== 'undefined' && trimmed.startsWith('/'))
    return `${window.location.origin}${trimmed}`
  return trimmed
}

function buildPrintDocument(receipt: PaymentReceiptData, branding: GymBranding | null) {
  const gymName = branding?.gymName?.trim() || 'Gym Management'
  const logoUrl = resolveAssetUrl(branding?.invoiceLogoUrl ?? branding?.gymLogoUrl)
  const paidOn = new Date(receipt.paymentDate).toLocaleString()
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="" style="width:48px;height:48px;object-fit:contain" />`
    : `<div style="width:40px;height:40px;border-radius:8px;background:#1d4ed8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${gymName.slice(0, 2).toUpperCase()}</div>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${receipt.receiptNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; background: #fff; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand h1 { margin: 0; font-size: 20px; color: #1d4ed8; }
    .brand p { margin: 2px 0 0; font-size: 12px; color: #6b7280; }
    .meta { text-align: right; font-size: 12px; color: #4b5563; }
    .member { margin-bottom: 16px; }
    .member strong { font-size: 16px; }
    .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; }
    .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #6b7280; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${logoHtml}
      <div>
        <h1>${gymName}</h1>
        <p>Payment receipt</p>
      </div>
    </div>
    <div class="meta">
      <div><strong>#${receipt.receiptNumber}</strong></div>
      <div>${paidOn}</div>
    </div>
  </div>
  <div class="member">
    <div>Received from</div>
    <strong>${receipt.memberName}</strong>
    <div>${receipt.memberId}</div>
    ${receipt.planName ? `<div>Plan: ${receipt.planName}</div>` : ''}
  </div>
  <div class="box">
    <div class="row"><span>Amount paid</span><strong>${formatInr(receipt.amountPaid)}</strong></div>
    <div class="row"><span>Payment method</span><span>${receipt.paymentMethod}</span></div>
    <div class="row"><span>Remaining balance</span><span>${formatInr(receipt.remainingBalance)}</span></div>
  </div>
  <div class="footer">Thank you for your payment — ${gymName}</div>
</body>
</html>`
}

export function PaymentReceiptModal({
  open,
  onClose,
  receipt,
  onNotificationPrefsChange,
}: {
  open: boolean
  onClose: () => void
  receipt: PaymentReceiptData | null
  onNotificationPrefsChange?: (prefs: { email: boolean; sms: boolean }) => void
}) {
  const printRef = useRef<HTMLDivElement>(null)
  const [sending, setSending] = useState<'email' | 'sms' | null>(null)
  const [enabling, setEnabling] = useState<'email' | 'sms' | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [prefsOverride, setPrefsOverride] = useState<{ email?: boolean; sms?: boolean }>({})

  const { data: branding } = useQuery({
    queryKey: ['receipt-branding'],
    queryFn: () => membershipPaymentsService.receiptBranding(),
    enabled: open,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (open) setPrefsOverride({})
  }, [open, receipt?.transactionId])

  if (!receipt) return null

  const emailEnabled = prefsOverride.email ?? receipt.receiveEmailNotifications ?? false
  const smsEnabled = prefsOverride.sms ?? receipt.receiveSmsNotifications ?? false
  const logoUrl = resolveAssetUrl(branding?.invoiceLogoUrl ?? branding?.gymLogoUrl)
  const gymName = branding?.gymName?.trim() || 'Gym Management'

  function handlePrint() {
    const html = buildPrintDocument(receipt!, branding ?? null)
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) {
      toast.error('Allow pop-ups in your browser to print the receipt.')
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    const trigger = () => {
      w.print()
      w.onafterprint = () => w.close()
    }
    if (w.document.readyState === 'complete') trigger()
    else w.onload = trigger
  }

  async function handleDownloadPdf() {
    setDownloading(true)
    try {
      const { data: blob } = await membershipPaymentsService.receiptPdf(receipt!.transactionId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${receipt!.receiptNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not download PDF.'))
    } finally {
      setDownloading(false)
    }
  }

  async function sendReceipt(channel: 'email' | 'sms') {
    setSending(channel)
    try {
      const { data: result } = await membershipPaymentsService.sendReceipt(receipt!.transactionId, channel)
      const row = channel === 'email' ? result.email : result.sms
      if (row.sent) toast.success(row.message ?? 'Sent.')
      else toast.error(row.message ?? 'Not sent.')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not send receipt.'))
    } finally {
      setSending(null)
    }
  }

  async function enableNotification(channel: 'email' | 'sms') {
    setEnabling(channel)
    try {
      await usersService.updateNotificationPreferences(receipt!.userId, {
        receiveEmailNotifications: channel === 'email' ? true : emailEnabled,
        receiveSmsNotifications: channel === 'sms' ? true : smsEnabled,
      })
      const next = {
        email: channel === 'email' ? true : emailEnabled,
        sms: channel === 'sms' ? true : smsEnabled,
      }
      setPrefsOverride(next)
      onNotificationPrefsChange?.(next)
      toast.success(channel === 'email' ? 'Email notifications enabled.' : 'SMS/WhatsApp notifications enabled.')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not update notification preferences.'))
    } finally {
      setEnabling(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Payment receipt" size="md">
      <div
        ref={printRef}
        className="space-y-4 rounded-xl border border-white/10 bg-white p-4 text-sm text-slate-800 shadow-inner"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="size-12 object-contain" />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
                {gymName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-blue-800">{gymName}</p>
              <p className="text-xs text-slate-500">Payment receipt</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-mono font-semibold text-slate-700">#{receipt.receiptNumber}</p>
            <p>{new Date(receipt.paymentDate).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {receipt.memberPhotoUrl ? (
            <img src={receipt.memberPhotoUrl} alt="" className="size-12 rounded-full object-cover" />
          ) : null}
          <div>
            <p className="font-semibold text-slate-900">{receipt.memberName}</p>
            <p className="text-slate-500">{receipt.memberId}</p>
          </div>
        </div>

        {receipt.planName && <p className="text-slate-600">Plan: {receipt.planName}</p>}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="text-slate-600">Amount paid</span>
            <strong className="text-slate-900">{formatInr(receipt.amountPaid)}</strong>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-600">Method</span>
            <span>{receipt.paymentMethod}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-600">Remaining balance</span>
            <span>{formatInr(receipt.remainingBalance)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={handlePrint}>
          Print receipt
        </Button>
        <Button type="button" variant="secondary" onClick={() => void handleDownloadPdf()} disabled={downloading} isLoading={downloading}>
          Download PDF
        </Button>

        {emailEnabled ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void sendReceipt('email')}
            disabled={Boolean(sending) || Boolean(enabling)}
            isLoading={sending === 'email'}
          >
            Email receipt
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void enableNotification('email')}
            disabled={Boolean(sending) || Boolean(enabling)}
            isLoading={enabling === 'email'}
          >
            Enable email
          </Button>
        )}

        {smsEnabled ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void sendReceipt('sms')}
            disabled={Boolean(sending) || Boolean(enabling)}
            isLoading={sending === 'sms'}
          >
            WhatsApp / SMS
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void enableNotification('sms')}
            disabled={Boolean(sending) || Boolean(enabling)}
            isLoading={enabling === 'sms'}
          >
            Enable SMS
          </Button>
        )}

        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
