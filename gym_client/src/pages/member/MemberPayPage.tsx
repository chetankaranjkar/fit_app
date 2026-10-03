import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { Button } from '../../components/ui/Button'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { getDashboardUser } from '../../lib/dashboardUser'
import { formatInr } from '../../lib/formatInr'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { PAY_OUTSTANDING_LABEL, RENEW_MEMBERSHIP_LABEL } from '../../lib/membershipStanding'
import { MemberLoadError, MemberLoadingState } from '../../components/member/MemberQueryState'
import { commercialService } from '../../services/commercial.service'
import {
  outcomeKindFromStatus,
  useRazorpayCheckout,
  type OnlinePaymentOutcome,
} from '../../features/commercial/useRazorpayCheckout'

const SUMMARY_KEY = ['member-online-payment-summary'] as const
const RECENT_COMPLETION_MS = 10 * 60 * 1000

type Notice = { tone: 'success' | 'info' | 'warning'; text: string }

const NOTICE_CLASS: Record<Notice['tone'], string> = {
  success: 'text-emerald-200',
  info: 'text-slate-300',
  warning: 'text-amber-200',
}

function noticeFor(outcome: OnlinePaymentOutcome): Notice {
  switch (outcome.kind) {
    case 'completed':
      return { tone: 'success', text: outcome.message }
    case 'confirming':
    case 'review':
      return { tone: 'warning', text: outcome.message }
    default:
      return { tone: 'info', text: outcome.message }
  }
}

export function MemberPayPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const { payMembership, checkStatus, waitForConfirmation } = useRazorpayCheckout()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const resumedOrderId = useRef<string | null>(null)

  const summaryQuery = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: async () => (await commercialService.getOnlinePaymentSummary()).data,
    retry: false,
  })
  const summary = summaryQuery.data

  const refreshBilling = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['member-billing-access'] }),
    ])
  }, [queryClient])

  const applyOutcome = useCallback(
    async (outcome: OnlinePaymentOutcome) => {
      setNotice(noticeFor(outcome))
      setConfirmingOrderId(outcome.kind === 'confirming' ? outcome.orderId : null)
      if (outcome.kind !== 'cancelled' && outcome.kind !== 'pending') await refreshBilling()
    },
    [refreshBilling],
  )

  const confirm = useCallback(
    async (orderId: string) => {
      setPolling(true)
      try {
        await applyOutcome(await waitForConfirmation(orderId))
      } finally {
        setPolling(false)
      }
    },
    [applyOutcome, waitForConfirmation],
  )

  // Reload / return after lost connectivity: resume the server-side status check for the latest attempt.
  useEffect(() => {
    const attempt = summary?.latestAttempt
    if (!attempt || resumedOrderId.current === attempt.orderId) return
    const kind = outcomeKindFromStatus(attempt.status)
    const recentlyCompleted =
      kind === 'completed' &&
      Date.now() - new Date(attempt.updatedDate ?? attempt.createdDate).getTime() < RECENT_COMPLETION_MS
    if (kind !== 'confirming' && kind !== 'review' && !recentlyCompleted) return
    resumedOrderId.current = attempt.orderId
    setNotice(noticeFor({ kind, message: attempt.message, orderId: attempt.orderId }))
    if (kind === 'confirming') {
      setConfirmingOrderId(attempt.orderId)
      void confirm(attempt.orderId)
    }
  }, [summary?.latestAttempt, confirm])

  const handlePay = async () => {
    if (paying || polling) return
    setError(null)
    setNotice(null)
    setPaying(true)
    try {
      const outcome = await payMembership(summary?.membershipPaymentId ?? undefined)
      resumedOrderId.current = outcome.orderId
      await applyOutcome(outcome)
      if (outcome.kind === 'confirming') await confirm(outcome.orderId)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not start the payment. Please try again.'))
      await refreshBilling()
    } finally {
      setPaying(false)
    }
  }

  const handleCheckStatus = async () => {
    if (!confirmingOrderId || polling) return
    setError(null)
    setPolling(true)
    try {
      await applyOutcome(await checkStatus(confirmingOrderId))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not check payment status. Please try again shortly.'))
    } finally {
      setPolling(false)
    }
  }

  const need = summary?.paymentNeed
  const busy = paying || polling || Boolean(confirmingOrderId)

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-lg pb-20 lg:pb-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/80">Billing</p>
          <h1 className="text-2xl font-bold text-white">{PAY_OUTSTANDING_LABEL}</h1>
          <p className="text-sm text-slate-400">
            Settle the balance on your current membership bill. This is not {RENEW_MEMBERSHIP_LABEL.toLowerCase()} — paying
            here does not add gym time.{' '}
            <Link to="/dashboard/member/portal" className="text-orange-400 hover:underline">
              Back to portal
            </Link>
          </p>
        </header>

        <GlassPanel className="mt-6 space-y-4 p-5">
          {summaryQuery.isLoading ? (
            <MemberLoadingState label="Loading billing status…" />
          ) : summaryQuery.isError ? (
            <MemberLoadError
              error={summaryQuery.error}
              fallback="Could not load your billing status."
              onRetry={() => void summaryQuery.refetch()}
            />
          ) : need === 'settle_outstanding' && summary ? (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm">
                <p className="text-slate-300">
                  Outstanding balance:{' '}
                  <span className="font-semibold text-amber-200">{formatInr(summary.outstandingAmount)}</span>
                </p>
                {summary.planName ? <p className="mt-1 text-slate-400">Plan: {summary.planName}</p> : null}
                {summary.nextDueDate ? (
                  <p className="mt-1 text-slate-400">
                    Due: {new Date(summary.nextDueDate).toLocaleDateString('en-IN')}
                  </p>
                ) : null}
              </div>

              {summary.onlinePaymentsEnabled ? (
                <Button type="button" onClick={handlePay} disabled={busy} fullWidth className="min-h-11">
                  {paying
                    ? 'Waiting for checkout…'
                    : confirmingOrderId
                      ? 'Confirming payment…'
                      : `Pay outstanding balance ${formatInr(summary.outstandingAmount)}`}
                </Button>
              ) : (
                <p className="text-sm text-slate-400">
                  Online payments are not enabled. Please contact the front desk to complete payment.
                </p>
              )}
            </>
          ) : need === 'renewal_required' && summary ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-white">{RENEW_MEMBERSHIP_LABEL}</p>
              <p className="text-slate-300">{summary.message}</p>
              {summary.membershipEndDate ? (
                <p className="text-slate-400">
                  {summary.planName ?? 'Membership'} ended{' '}
                  {new Date(summary.membershipEndDate).toLocaleDateString('en-IN')}.
                </p>
              ) : null}
            </div>
          ) : need === 'billing_closed' && summary ? (
            <p className="text-sm text-slate-300">{summary.message}</p>
          ) : (
            <p className="text-sm text-emerald-200">You have no outstanding membership balance.</p>
          )}

          {notice ? (
            <p className={`text-sm ${NOTICE_CLASS[notice.tone]}`} role="status">
              {notice.text}
            </p>
          ) : null}
          {confirmingOrderId && !polling ? (
            <Button type="button" variant="secondary" onClick={handleCheckStatus}>
              Check payment status
            </Button>
          ) : null}
          {error ? (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </GlassPanel>
      </DashboardPageContent>
    </DashboardLayout>
  )
}
