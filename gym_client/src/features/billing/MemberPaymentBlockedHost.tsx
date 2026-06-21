import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { formatInr } from '../../lib/formatInr'
import { subscribePaymentBlocked, type PaymentBlockedDetail } from '../../lib/paymentBlockedEvents'
import { api } from '../../lib/api'
import { authService } from '../../services/auth.service'
import { commercialService } from '../../services/commercial.service'
import { useRazorpayCheckout } from '../commercial/useRazorpayCheckout'
import { getApiErrorMessage } from '../../lib/apiErrors'

export function MemberPaymentBlockedHost() {
  const navigate = useNavigate()
  const { payMembership } = useRazorpayCheckout()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<PaymentBlockedDetail | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const configQuery = useQuery({
    queryKey: ['public-commercial-config'],
    queryFn: async () => (await commercialService.getConfig()).data,
  })

  useEffect(() => subscribePaymentBlocked((d) => {
    setDetail(d)
    setOpen(true)
  }), [])

  useEffect(() => {
    if (
      authService.hasAppRole('ADMIN') ||
      authService.hasAppRole('STAFF') ||
      authService.hasAppRole('TRAINER') ||
      authService.hasAppRole('INSTRUCTOR')
    )
      return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get<{
          accessBlocked: boolean
          pendingAmount?: number
          nextDueDate?: string
          message?: string
        }>('/me/membership-billing/access')
        if (cancelled || !data?.accessBlocked) return
        setDetail({
          pendingAmount: data.pendingAmount,
          dueDate: data.nextDueDate,
          message: data.message,
        })
        setOpen(true)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!open) return null

  const pending = detail?.pendingAmount
  const due = detail?.dueDate
  const onlineEnabled = Boolean(configQuery.data?.enableOnlinePayments)

  const handlePayOnline = async () => {
    setPayError(null)
    setPaying(true)
    try {
      await payMembership()
      setOpen(false)
      window.location.reload()
    } catch (err) {
      setPayError(getApiErrorMessage(err, 'Payment could not be completed.'))
    } finally {
      setPaying(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      /* ignore */
    }
    authService.clearSession()
    navigate('/login')
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[rgba(15,12,30,0.97)] p-6 shadow-2xl shadow-rose-900/20">
        <h2 className="text-xl font-bold text-white">Access denied</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {detail?.message ?? 'Your membership payment is pending. Please contact gym administration.'}
        </p>
        <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm">
          {pending != null && (
            <p className="text-slate-200">
              Pending amount: <span className="font-semibold text-amber-200">{formatInr(pending)}</span>
            </p>
          )}
          {due && (
            <p className="text-slate-400">
              Due date:{' '}
              <span className="text-slate-200">
                {new Date(due).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {onlineEnabled && pending != null && pending > 0 ? (
            <Button type="button" onClick={handlePayOnline} disabled={paying}>
              {paying ? 'Opening checkout…' : 'Pay online now'}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/member/pay')}>
            Billing details
          </Button>
          <Button type="button" variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
        {payError ? (
          <p className="mt-3 text-xs text-rose-300" role="alert">
            {payError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
