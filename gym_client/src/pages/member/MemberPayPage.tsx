import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { Button } from '../../components/ui/Button'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { getDashboardUser } from '../../lib/dashboardUser'
import { formatInr } from '../../lib/formatInr'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { commercialService } from '../../services/commercial.service'
import { useRazorpayCheckout } from '../../features/commercial/useRazorpayCheckout'

export function MemberPayPage() {
  const { userName } = getDashboardUser()
  const { payMembership } = useRazorpayCheckout()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const configQuery = useQuery({
    queryKey: ['public-commercial-config'],
    queryFn: async () => (await commercialService.getConfig()).data,
  })

  const billingQuery = useQuery({
    queryKey: ['member-billing-access'],
    queryFn: async () => (await commercialService.getBillingAccess()).data,
  })

  const billing = billingQuery.data
  const onlineEnabled = Boolean(configQuery.data?.enableOnlinePayments)

  const handlePay = async () => {
    setError(null)
    setMessage(null)
    setPaying(true)
    try {
      const result = await payMembership(billing?.membershipPaymentId ?? undefined)
      setMessage(result.message || 'Payment recorded successfully.')
      await billingQuery.refetch()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Payment could not be completed.'))
    } finally {
      setPaying(false)
    }
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-lg pb-20 lg:pb-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/80">Billing</p>
          <h1 className="text-2xl font-bold text-white">Pay membership</h1>
          <p className="text-sm text-slate-400">
            Settle your pending balance online.{' '}
            <Link to="/dashboard/member/portal" className="text-orange-400 hover:underline">
              Back to portal
            </Link>
          </p>
        </header>

        <GlassPanel className="mt-6 space-y-4 p-5">
          {billingQuery.isLoading ? (
            <p className="text-sm text-slate-400">Loading billing status…</p>
          ) : billing?.pendingAmount && billing.pendingAmount > 0 ? (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm">
                <p className="text-slate-300">
                  Pending amount:{' '}
                  <span className="font-semibold text-amber-200">{formatInr(billing.pendingAmount)}</span>
                </p>
                {billing.nextDueDate ? (
                  <p className="mt-1 text-slate-400">
                    Due: {new Date(billing.nextDueDate).toLocaleDateString('en-IN')}
                  </p>
                ) : null}
              </div>

              {onlineEnabled ? (
                <Button type="button" onClick={handlePay} disabled={paying}>
                  {paying ? 'Opening checkout…' : 'Pay with Razorpay'}
                </Button>
              ) : (
                <p className="text-sm text-slate-400">
                  Online payments are not enabled. Please contact the front desk to complete payment.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-emerald-200">You have no pending membership balance.</p>
          )}

          {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
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
