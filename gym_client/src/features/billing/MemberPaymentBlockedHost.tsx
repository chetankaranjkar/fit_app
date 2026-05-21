import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { formatInr } from '../../lib/formatInr'
import { subscribePaymentBlocked, type PaymentBlockedDetail } from '../../lib/paymentBlockedEvents'
import { api } from '../../lib/api'
import { authService } from '../../services/auth.service'

export function MemberPaymentBlockedHost() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<PaymentBlockedDetail | null>(null)

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
          <Button type="button" variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  )
}
