import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { usersService } from '../../services/users.service'
import { formatInr } from '../../lib/formatInr'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { usePermission } from '../../features/auth/hooks/usePermission'
import { authService } from '../../services/auth.service'
import { Button } from '../ui/Button'
import type { User } from '../../types/user'
import type { MembershipPaymentDetail, MembershipPaymentTransaction } from '../../types/membershipPayment'
import { collectPaymentPath, memberProfilePath } from '../../lib/membershipPaymentNavigation'

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

function formatDueDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function MemberOnboardingBillingActions({ user, userId }: { user: User; userId: number }) {
  const canPayments = usePermission(authService.permissionCodes.payments)
  const queryClient = useQueryClient()
  const [sendingKey, setSendingKey] = useState<string | null>(null)
  const [enablingKey, setEnablingKey] = useState<string | null>(null)
  const [prefsOverride, setPrefsOverride] = useState<{ email?: boolean; sms?: boolean }>({})

  const emailEnabled = prefsOverride.email ?? user.receiveEmailNotifications ?? false
  const smsEnabled = prefsOverride.sms ?? user.receiveSmsNotifications ?? false

  const { data = [], isLoading } = useQuery({
    queryKey: ['membership-payments-user', userId],
    queryFn: async () => {
      const { data: d } = await membershipPaymentsService.byUser(userId)
      return Array.isArray(d) ? d : []
    },
    enabled: userId > 0 && canPayments,
  })

  const primary = useMemo(() => (data.length ? pickPrimaryBilling(data) : null), [data])
  const lastTx = useMemo(() => (primary ? latestCompletedTransaction(primary) : null), [primary])
  const hasPending = (primary?.pendingAmount ?? user.pendingPaymentAmount ?? 0) > 0.02
  const membershipPaymentId = primary?.id ?? user.openMembershipPaymentId ?? null
  const dueDate = formatDueDate(primary?.nextDueDate ?? user.paymentNextDueDate)
  const pendingAmount = primary?.pendingAmount ?? user.pendingPaymentAmount ?? 0

  if (!canPayments) return null
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs text-slate-500">Loading billing…</p>
      </div>
    )
  }
  if (!hasPending && !lastTx) return null

  async function sendReceipt(transactionId: number, channel: 'email' | 'sms') {
    setSendingKey(`receipt-${transactionId}-${channel}`)
    try {
      const { data: result } = await membershipPaymentsService.sendReceipt(transactionId, channel)
      const row = channel === 'email' ? result.email : result.sms
      if (row.sent) toast.success(row.message ?? 'Sent.')
      else toast.error(row.message ?? 'Not sent.')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not send receipt.'))
    } finally {
      setSendingKey(null)
    }
  }

  async function sendDueReminder(paymentId: number, channel: 'email' | 'sms') {
    setSendingKey(`due-${paymentId}-${channel}`)
    try {
      const { data: result } = await membershipPaymentsService.sendDueReminder(paymentId, channel)
      const row = channel === 'email' ? result.email : result.sms
      if (row.sent) toast.success(row.message ?? 'Reminder sent.')
      else toast.error(row.message ?? 'Reminder was not sent.')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not send reminder.'))
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
      toast.success(channel === 'email' ? 'Email notifications enabled.' : 'SMS notifications enabled.')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not update notification preferences.'))
    } finally {
      setEnablingKey(null)
    }
  }

  const collectHref =
    user.openMembershipId != null
      ? collectPaymentPath(user.openMembershipId, userId, memberProfilePath(userId))
      : null

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
      <h3 className="text-sm font-semibold text-amber-100">Billing notifications</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Send only when the member has opted in and gym email/SMS is configured.
      </p>

      {hasPending && membershipPaymentId != null ? (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <p className="text-xs font-medium text-white">
            {formatInr(pendingAmount)} pending
            {dueDate ? <span className="text-slate-400"> · due {dueDate}</span> : null}
            {user.isPaymentOverdue ? (
              <span className="ml-1 text-rose-300">(overdue)</span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {emailEnabled ? (
              <Button
                size="sm"
                variant="soft"
                isLoading={sendingKey === `due-${membershipPaymentId}-email`}
                disabled={Boolean(sendingKey)}
                onClick={() => sendDueReminder(membershipPaymentId, 'email')}
              >
                Email reminder
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                isLoading={enablingKey === 'email'}
                disabled={Boolean(sendingKey) || enablingKey === 'sms'}
                onClick={() => enableNotification('email')}
              >
                Enable email
              </Button>
            )}
            {smsEnabled ? (
              <Button
                size="sm"
                variant="soft"
                isLoading={sendingKey === `due-${membershipPaymentId}-sms`}
                disabled={Boolean(sendingKey)}
                onClick={() => sendDueReminder(membershipPaymentId, 'sms')}
              >
                SMS reminder
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                isLoading={enablingKey === 'sms'}
                disabled={Boolean(sendingKey) || enablingKey === 'email'}
                onClick={() => enableNotification('sms')}
              >
                Enable SMS
              </Button>
            )}
            {collectHref ? (
              <Link
                to={collectHref}
                className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                Collect payment
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {lastTx ? (
        <div
          className={[
            'space-y-2',
            hasPending ? 'mt-4 border-t border-white/10 pt-4' : 'mt-4',
          ].join(' ')}
        >
          <p className="text-xs font-medium text-slate-300">Last payment receipt</p>
          <div className="flex flex-wrap gap-2">
            {emailEnabled ? (
              <Button
                size="sm"
                variant="soft"
                isLoading={sendingKey === `receipt-${lastTx.id}-email`}
                disabled={Boolean(sendingKey)}
                onClick={() => sendReceipt(lastTx.id, 'email')}
              >
                Email receipt
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                isLoading={enablingKey === 'email'}
                disabled={Boolean(sendingKey) || enablingKey === 'sms'}
                onClick={() => enableNotification('email')}
              >
                Enable email
              </Button>
            )}
            {smsEnabled ? (
              <Button
                size="sm"
                variant="soft"
                isLoading={sendingKey === `receipt-${lastTx.id}-sms`}
                disabled={Boolean(sendingKey)}
                onClick={() => sendReceipt(lastTx.id, 'sms')}
              >
                SMS receipt
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                isLoading={enablingKey === 'sms'}
                disabled={Boolean(sendingKey) || enablingKey === 'email'}
                onClick={() => enableNotification('sms')}
              >
                Enable SMS
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
