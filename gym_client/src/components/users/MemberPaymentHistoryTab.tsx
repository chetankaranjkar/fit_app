import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { usersService } from '../../services/users.service'
import { formatInr } from '../../lib/formatInr'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { usePermission } from '../../features/auth/hooks/usePermission'
import { authService } from '../../services/auth.service'
import { Button } from '../ui/Button'
import { MembershipFinancialSummaryCard } from '../billing/MembershipFinancialSummaryCard'
import type { MembershipPaymentDetail, MembershipPaymentTransaction } from '../../types/membershipPayment'
import {
  computeNetPayable,
  getMembershipAmount,
  paymentStatusBadgeClass,
} from '../billing/membershipPaymentUi'
import { collectPaymentPath, memberProfilePath } from '../../lib/membershipPaymentNavigation'

function statusClass(status: string) {
  const u = status.toLowerCase()
  if (u === 'paid') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
  if (u === 'partial' || u === 'pending') return 'border-amber-500/40 bg-amber-500/15 text-amber-200'
  if (u === 'overdue') return 'border-rose-500/40 bg-rose-500/15 text-rose-200'
  return 'border-white/10 bg-white/5 text-slate-300'
}

function lastPaymentDate(row: MembershipPaymentDetail): string | null {
  if (row.transactions?.length) {
    const sorted = [...row.transactions].sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
    )
    return sorted[0]?.transactionDate ?? null
  }
  return row.paymentDate ?? null
}

function pickPrimaryBilling(rows: MembershipPaymentDetail[]) {
  const withBalance = rows.find((r) => r.pendingAmount > 0.02)
  return withBalance ?? rows[0]
}

function latestCompletedTransaction(row: MembershipPaymentDetail): MembershipPaymentTransaction | null {
  const completed = row.transactions.filter((t) => (t.status ?? 'Completed') === 'Completed')
  if (!completed.length) return null
  return [...completed].sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
  )[0]
}

type IconActionTone = 'neutral' | 'primary' | 'success' | 'muted'

const iconActionToneClass: Record<IconActionTone, string> = {
  neutral:
    'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white',
  primary:
    'border-blue-400/30 bg-blue-500/10 text-blue-200 hover:border-blue-400/60 hover:bg-blue-500/20 hover:text-white',
  success:
    'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:border-emerald-400/70 hover:bg-emerald-500/25 hover:text-white shadow-sm shadow-emerald-500/10',
  muted:
    'border-white/5 bg-white/[0.02] text-slate-500 cursor-not-allowed opacity-60',
}

function IconActionButton({
  label,
  tone = 'neutral',
  busy = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  tone?: IconActionTone
  busy?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      onClick={onClick}
      className={[
        'inline-flex size-8 items-center justify-center rounded-lg border transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40',
        'hover:-translate-y-0.5 active:translate-y-0',
        iconActionToneClass[tone],
      ].join(' ')}
    >
      {busy ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}

const ICONS = {
  collect: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2m4 0h4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  ),
  pdf: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
  ),
  sms: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6l2.5-2.5H18a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v13z" />
    </svg>
  ),
  timeline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  enableEmail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4m0 0l-1.5-1.5M12 15l1.5-1.5" />
    </svg>
  ),
  enableSms: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6l2.5-2.5H18a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v13z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 0l-1.5-1.5M12 12l1.5-1.5" />
    </svg>
  ),
}

function SendReceiptButtons({
  transactionId,
  sendingKey,
  enablingKey,
  emailEnabled,
  smsEnabled,
  onSend,
  onEnable,
}: {
  transactionId: number
  sendingKey: string | null
  enablingKey: string | null
  emailEnabled: boolean
  smsEnabled: boolean
  onSend: (transactionId: number, channel: 'email' | 'sms') => void
  onEnable: (channel: 'email' | 'sms') => void
}) {
  const emailBusy = sendingKey === `${transactionId}-email`
  const smsBusy = sendingKey === `${transactionId}-sms`
  const emailEnabling = enablingKey === 'email'
  const smsEnabling = enablingKey === 'sms'

  return (
    <>
      {emailEnabled ? (
        <IconActionButton
          label="Send receipt by email"
          tone="success"
          busy={emailBusy}
          disabled={smsBusy || emailEnabling || smsEnabling}
          onClick={() => onSend(transactionId, 'email')}
        >
          {ICONS.email}
        </IconActionButton>
      ) : (
        <IconActionButton
          label="Enable email notifications for member"
          tone="primary"
          busy={emailEnabling}
          disabled={emailBusy || smsBusy || smsEnabling}
          onClick={() => onEnable('email')}
        >
          {ICONS.enableEmail}
        </IconActionButton>
      )}
      {smsEnabled ? (
        <IconActionButton
          label="Send receipt by SMS / WhatsApp"
          tone="success"
          busy={smsBusy}
          disabled={emailBusy || emailEnabling || smsEnabling}
          onClick={() => onSend(transactionId, 'sms')}
        >
          {ICONS.sms}
        </IconActionButton>
      ) : (
        <IconActionButton
          label="Enable SMS notifications for member"
          tone="primary"
          busy={smsEnabling}
          disabled={emailBusy || smsBusy || emailEnabling}
          onClick={() => onEnable('sms')}
        >
          {ICONS.enableSms}
        </IconActionButton>
      )}
    </>
  )
}

export function MemberPaymentHistoryTab({
  userId,
  memberName,
  memberPhotoUrl,
  receiveEmailNotifications = false,
  receiveSmsNotifications = false,
}: {
  userId: number
  memberName?: string
  memberPhotoUrl?: string | null
  receiveEmailNotifications?: boolean
  receiveSmsNotifications?: boolean
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canPayments = usePermission(authService.permissionCodes.payments)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [ledgerOpen, setLedgerOpen] = useState(true)
  const [sendingKey, setSendingKey] = useState<string | null>(null)
  const [enablingKey, setEnablingKey] = useState<string | null>(null)
  const [prefsOverride, setPrefsOverride] = useState<{ email?: boolean; sms?: boolean }>({})

  const emailEnabled = prefsOverride.email ?? receiveEmailNotifications
  const smsEnabled = prefsOverride.sms ?? receiveSmsNotifications

  const { data = [], isLoading } = useQuery({
    queryKey: ['membership-payments-user', userId],
    queryFn: async () => {
      const { data: d } = await membershipPaymentsService.byUser(userId)
      return Array.isArray(d) ? d : []
    },
    enabled: userId > 0 && canPayments,
  })

  const rows = useMemo(() => [...data].sort((a, b) => b.id - a.id), [data])
  const primary = useMemo(() => (rows.length ? pickPrimaryBilling(rows) : null), [rows])

  const { data: financialSummary } = useQuery({
    queryKey: ['membership-financial-summary', primary?.membershipId],
    queryFn: async () => {
      const { data: d } = await membershipPaymentsService.financialSummary(primary!.membershipId)
      return d
    },
    enabled: !!primary?.membershipId && canPayments,
  })

  const { data: ledger } = useQuery({
    queryKey: ['member-ledger', userId],
    queryFn: async () => {
      const { data: d } = await membershipPaymentsService.memberLedger(userId)
      return d
    },
    enabled: userId > 0 && canPayments,
  })

  const summaryFromRow = useMemo(() => {
    if (!primary) return null
    const membershipFee = getMembershipAmount(primary)
    const couponDiscount = primary.couponDiscountAmount ?? 0
    const net = computeNetPayable(
      primary.totalAmount,
      primary.discountAmount,
      primary.waiverAmount,
      primary.netPayableAmount,
      primary.finalBillAmount,
      couponDiscount,
    )
    return {
      membershipFee,
      couponDiscount,
      approvedWaiveOff: primary.waiverAmount,
      netPayable: net,
      totalPaid: primary.paidAmount,
      outstandingBalance: primary.pendingAmount,
      isOverdue: primary.paymentStatus === 'Overdue',
    }
  }, [primary])

  const summary = financialSummary
    ? {
        membershipFee: financialSummary.membershipFee,
        couponDiscount: financialSummary.couponDiscount,
        approvedWaiveOff: financialSummary.approvedWaiveOff,
        netPayable: financialSummary.netPayableAmount,
        totalPaid: financialSummary.totalPaid,
        outstandingBalance: financialSummary.outstandingBalance,
        isOverdue: financialSummary.isOverdue,
      }
    : summaryFromRow

  const displayName = memberName ?? financialSummary?.memberName ?? ledger?.memberName ?? 'Member'
  const photo = memberPhotoUrl ?? financialSummary?.memberPhotoUrl ?? ledger?.profilePictureUrl

  async function downloadInvoice(paymentId: number) {
    try {
      const { data: blob } = await membershipPaymentsService.invoicePdf(paymentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `membership-invoice-${paymentId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download invoice.')
    }
  }

  async function openInvoicePrint(paymentId: number) {
    try {
      const { data: blob } = await membershipPaymentsService.invoicePdf(paymentId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 120_000)
    } catch {
      toast.error('Could not open invoice for printing.')
    }
  }

  async function sendReceipt(transactionId: number, channel: 'email' | 'sms') {
    setSendingKey(`${transactionId}-${channel}`)
    try {
      const { data } = await membershipPaymentsService.sendReceipt(transactionId, channel)
      const result = channel === 'email' ? data.email : data.sms
      if (result.sent) {
        toast.success(result.message ?? (channel === 'email' ? 'Email sent.' : 'SMS sent.'))
      } else {
        toast.error(result.message ?? 'Notification was not sent.')
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not send notification.'))
    } finally {
      setSendingKey(null)
    }
  }

  async function enableNotification(channel: 'email' | 'sms') {
    setEnablingKey(channel)
    try {
      await usersService.updateNotificationPreferences(userId, {
        receiveEmailNotifications: channel === 'email' ? true : emailEnabled,
        receiveSmsNotifications: channel === 'sms' ? true : smsEnabled,
      })
      setPrefsOverride((prev) => ({
        ...prev,
        ...(channel === 'email' ? { email: true } : { sms: true }),
      }))
      await queryClient.invalidateQueries({ queryKey: ['user', userId] })
      toast.success(
        channel === 'email' ? 'Email notifications enabled for member.' : 'SMS notifications enabled for member.',
      )
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not enable notifications.'))
    } finally {
      setEnablingKey(null)
    }
  }

  if (!canPayments) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        You need Payments permission to view membership billing history.
      </p>
    )
  }

  if (isLoading) return <p className="text-slate-400">Loading payment history…</p>

  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
        No membership billing records for this member yet.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          {photo ? (
            <img src={photo} alt="" className="size-16 rounded-full border border-white/15 object-cover" />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-slate-300">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-white">{displayName}</p>
            <p className="text-sm text-slate-400">Member ID: M-{userId.toString().padStart(5, '0')}</p>
            {primary?.planName && (
              <p className="mt-1 text-sm text-slate-300">
                Current plan: {primary.planName}
                <span
                  className={`ml-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(primary.paymentStatus)}`}
                >
                  {primary.paymentStatus}
                </span>
              </p>
            )}
            {primary && primary.pendingAmount > 0.02 && (
              <Button
                type="button"
                className="mt-3 !py-1.5 text-xs"
                onClick={() =>
                  navigate(collectPaymentPath(primary.membershipId, userId, memberProfilePath(userId)))
                }
              >
                Collect payment
              </Button>
            )}
          </div>
        </div>
        {summary && (
          <MembershipFinancialSummaryCard
            className="mt-4"
            membershipFee={summary.membershipFee}
            couponDiscount={summary.couponDiscount}
            approvedWaiveOff={summary.approvedWaiveOff}
            netPayable={summary.netPayable}
            totalPaid={summary.totalPaid}
            outstandingBalance={summary.outstandingBalance}
            isOverdue={summary.isOverdue}
          />
        )}
      </section>

      {ledger && ledger.periods.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={() => setLedgerOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-white"
          >
            Member ledger
            <span className="text-xs text-slate-500">{ledgerOpen ? 'Hide' : 'Show'}</span>
          </button>
          {ledgerOpen && (
            <div className="mt-4 space-y-4">
              {ledger.periods.map((period) => (
                <div key={period.membershipPaymentId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="font-medium text-slate-200">{period.planName ?? 'Membership'}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-3">
                    <div>
                      <dt>Fee</dt>
                      <dd className="text-slate-200">{formatInr(period.membershipFee)}</dd>
                    </div>
                    <div>
                      <dt>Coupon</dt>
                      <dd className="text-emerald-300">−{formatInr(period.couponDiscount)}</dd>
                    </div>
                    <div>
                      <dt>Waive-off</dt>
                      <dd className="text-violet-300">−{formatInr(period.approvedWaiveOff)}</dd>
                    </div>
                    <div>
                      <dt>Net</dt>
                      <dd className="text-white">{formatInr(period.netPayable)}</dd>
                    </div>
                    <div>
                      <dt>Paid</dt>
                      <dd>{formatInr(period.totalPaid)}</dd>
                    </div>
                    <div>
                      <dt>Outstanding</dt>
                      <dd className="text-amber-200">{formatInr(period.outstandingBalance)}</dd>
                    </div>
                  </dl>
                  {period.payments.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-white/10 pt-2 text-xs">
                      {period.payments.map((t) => (
                        <li key={t.id} className="flex justify-between gap-2 text-slate-300">
                          <span>
                            {t.receiptNumber ?? `#${t.id}`} · {t.transactionMethod}
                            {t.status && t.status !== 'Completed' && (
                              <span className="ml-1 text-slate-500">({t.status})</span>
                            )}
                          </span>
                          <span className="tabular-nums">{formatInr(t.transactionAmount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-sm">
        <table className="min-w-[720px] w-full text-left text-sm text-slate-200">
          <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Membership</th>
              <th className="px-4 py-3 text-right">Original</th>
              <th className="px-4 py-3">Coupon</th>
              <th className="px-4 py-3 text-right">Final</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last payment</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const lp = lastPaymentDate(row)
              const open = expandedId === row.id
              const latestTx = latestCompletedTransaction(row)
              return (
                <Fragment key={row.id}>
                  <tr className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {row.invoiceNumber ?? row.paymentNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.planName ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatInr(row.originalAmount ?? row.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.couponCode ? (
                        <span className="font-mono text-emerald-200/90">
                          {row.couponCode}
                          {(row.couponDiscountAmount ?? 0) > 0 && (
                            <span className="block text-slate-500">−{formatInr(row.couponDiscountAmount!)}</span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">
                      {formatInr(row.finalBillAmount ?? row.netPayableAmount ?? row.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-200/90">
                      {formatInr(row.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-200/90">
                      {formatInr(row.pendingAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(row.paymentStatus)}`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {lp ? new Date(lp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.pendingAmount > 0.02 && (
                          <IconActionButton
                            label="Collect payment"
                            tone="primary"
                            onClick={() =>
                              navigate(
                                collectPaymentPath(row.membershipId, userId, memberProfilePath(userId)),
                              )
                            }
                          >
                            {ICONS.collect}
                          </IconActionButton>
                        )}
                        <IconActionButton
                          label="Download invoice PDF"
                          disabled={row.invoiceId == null}
                          onClick={() => void downloadInvoice(row.id)}
                        >
                          {ICONS.pdf}
                        </IconActionButton>
                        {latestTx && (
                          <SendReceiptButtons
                            transactionId={latestTx.id}
                            sendingKey={sendingKey}
                            enablingKey={enablingKey}
                            emailEnabled={emailEnabled}
                            smsEnabled={smsEnabled}
                            onSend={sendReceipt}
                            onEnable={enableNotification}
                          />
                        )}
                        <IconActionButton
                          label={open ? 'Hide timeline' : 'Show timeline'}
                          onClick={() => setExpandedId(open ? null : row.id)}
                        >
                          {ICONS.timeline}
                        </IconActionButton>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-black/20">
                      <td colSpan={10} className="px-4 py-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Billing timeline ({row.installmentCount ?? row.transactions.length} installments)
                        </p>
                        {(row.timeline?.length ?? 0) === 0 &&
                        row.transactions.filter((t) => (t.status ?? 'Completed') === 'Completed').length === 0 ? (
                          <p className="text-sm text-slate-500">No activity recorded.</p>
                        ) : (
                          <ul className="space-y-2">
                            {row.transactions
                              .filter((t) => (t.status ?? 'Completed') === 'Completed')
                              .sort(
                                (a, b) =>
                                  new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
                              )
                              .map((t) => (
                                <li
                                  key={t.id}
                                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="text-slate-500">
                                        {new Date(t.transactionDate).toLocaleString('en-IN', {
                                          dateStyle: 'medium',
                                          timeStyle: 'short',
                                        })}
                                      </p>
                                      <p className="font-medium text-white">
                                        {t.receiptNumber ? `${t.receiptNumber} · ` : ''}
                                        {formatInr(t.transactionAmount)} · {t.transactionMethod}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <SendReceiptButtons
                                        transactionId={t.id}
                                        sendingKey={sendingKey}
                                        enablingKey={enablingKey}
                                        emailEnabled={emailEnabled}
                                        smsEnabled={smsEnabled}
                                        onSend={sendReceipt}
                                        onEnable={enableNotification}
                                      />
                                    </div>
                                  </div>
                                </li>
                              ))}
                            {(row.timeline?.length ?? 0) > 0 &&
                              row.timeline!.map((ev, i) => (
                                <li
                                  key={`ev-${i}`}
                                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300"
                                >
                                  <p className="text-slate-500">
                                    {new Date(ev.occurredAt).toLocaleString('en-IN', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })}
                                  </p>
                                  <p className="font-medium text-white">{ev.label ?? ev.eventType}</p>
                                </li>
                              ))}
                          </ul>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="!py-1.5 !text-xs"
                            onClick={() => void openInvoicePrint(row.id)}
                            disabled={row.invoiceId == null}
                          >
                            Print invoice
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
