import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { MembershipFinancialSummaryCard } from '../components/billing/MembershipFinancialSummaryCard'
import { waiveOffRequestsService } from '../services/waiveOffRequests.service'
import { formatInr } from '../lib/formatInr'
import { getApiErrorMessage } from '../lib/apiErrors'
import { usePermission } from '../features/auth/hooks/usePermission'
import { authService } from '../services/auth.service'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

export function WaiveOffRequestsPage() {
  const { userName } = getDashboardUser()
  const canPay = usePermission(authService.permissionCodes.payments)
  const canApprove = usePermission(authService.permissionCodes.approveWaiveOff)
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending')
  const [approveId, setApproveId] = useState<number | null>(null)
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['waive-off-requests', filter],
    queryFn: async () => {
      const { data } = await waiveOffRequestsService.list(filter)
      return Array.isArray(data) ? data : []
    },
    enabled: canPay,
  })

  const { data: approveDetail } = useQuery({
    queryKey: ['waive-off-detail', approveId],
    queryFn: async () => {
      const { data } = await waiveOffRequestsService.get(approveId!)
      return data
    },
    enabled: approveId != null,
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => waiveOffRequestsService.approve(id),
    onSuccess: () => {
      toast.success('Waive-off approved')
      setApproveId(null)
      queryClient.invalidateQueries({ queryKey: ['waive-off-requests'] })
      queryClient.invalidateQueries({ queryKey: ['membership-payment'] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Approval failed')),
  })

  const rejectMutation = useMutation({
    mutationFn: () => waiveOffRequestsService.reject(rejectId!, rejectReason),
    onSuccess: () => {
      toast.success('Waive-off rejected')
      setRejectId(null)
      setRejectReason('')
      queryClient.invalidateQueries({ queryKey: ['waive-off-requests'] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Rejection failed')),
  })

  if (!canPay) {
    return (
      <DashboardLayout userName={userName}>
        <p className="px-6 text-slate-400">Payments permission required.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Billing"
        titleGradient="waive-off requests"
        subtitle="Admin-approved fee reductions (distinct from coupon discounts)"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filter === s ? 'border-blue-400/50 bg-blue-500/20 text-blue-100' : 'border-white/10 text-slate-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading && <p className="text-slate-500">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-slate-500">
              No requests in this view.
            </p>
          )}
          {rows.map((row) => (
            <article
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex gap-3">
                {row.memberPhotoUrl ? (
                  <img src={row.memberPhotoUrl} alt="" className="size-12 rounded-full object-cover" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-full bg-white/10 text-slate-400">
                    {(row.memberName ?? '?').charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white">{row.memberName}</p>
                  <p className="text-sm text-slate-400">{row.planName}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Requested: <strong className="text-amber-200">{formatInr(row.requestedAmount)}</strong>
                  </p>
                  <p className="text-xs text-slate-500">{row.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    By {row.requestedByName} · {new Date(row.requestedDate).toLocaleString()}
                  </p>
                </div>
              </div>
              {canApprove && row.status === 'Pending' && (
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setApproveId(row.id)}>
                    Approve
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setRejectId(row.id)}>
                    Reject
                  </Button>
                </div>
              )}
              {row.status !== 'Pending' && (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-slate-400">
                  {row.status}
                </span>
              )}
            </article>
          ))}
        </div>
      </DashboardSubpageShell>

      <Modal open={approveId != null} onClose={() => setApproveId(null)} title="Approve waive-off" size="wide">
        {approveDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {approveDetail.memberPhotoUrl && (
                <img src={approveDetail.memberPhotoUrl} alt="" className="size-14 rounded-full object-cover" />
              )}
              <div>
                <p className="text-lg font-semibold text-white">{approveDetail.memberName}</p>
                <p className="text-sm text-slate-400">{approveDetail.planName}</p>
              </div>
            </div>
            <MembershipFinancialSummaryCard
              membershipFee={approveDetail.membershipFee}
              couponDiscount={approveDetail.couponDiscount}
              approvedWaiveOff={approveDetail.approvedWaiveOffTotal}
              netPayable={approveDetail.membershipFee - approveDetail.couponDiscount - approveDetail.approvedWaiveOffTotal}
              totalPaid={0}
              outstandingBalance={0}
            />
            <p className="text-sm text-amber-200">
              Additional waive-off requested: <strong>{formatInr(approveDetail.requestedAmount)}</strong>
            </p>
            <p className="text-sm text-slate-400">{approveDetail.reason}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setApproveId(null)}>
                Cancel
              </Button>
              <Button onClick={() => approveMutation.mutate(approveId!)} disabled={approveMutation.isPending}>
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={rejectId != null} onClose={() => setRejectId(null)} title="Reject waive-off">
        <Input label="Rejection reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejectId(null)}>
            Cancel
          </Button>
          <Button onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
            Reject
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
