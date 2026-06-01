import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../components/layout/DashboardSubpageShell'
import { MetricCard } from '../components/dashboard/MetricCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { usePermission } from '../features/auth/hooks/usePermission'
import { authService } from '../services/auth.service'
import { paymentsService } from '../services/payments.service'
import { reportsService } from '../services/reports.service'
import { userMembershipsService } from '../services/userMemberships.service'
import { membershipPaymentsService } from '../services/membershipPayments.service'
import { couponsService } from '../services/coupons.service'
import { InvoicesService, type Invoice } from '../services/invoices.service'
import { BillingSummaryCard } from '../components/billing/BillingSummaryCard'
import {
  MEMBERSHIP_PAYMENT_METHODS,
  computeNetPayable,
  getMembershipAmount,
  getRemainingBalance,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from '../components/billing/membershipPaymentUi'
import type { Payment, CreatePaymentDto, UpdatePaymentDto } from '../types/payment'
import type { PaymentMode } from '../types/payment'
import type { MembershipPaymentMethod } from '../types/membershipPayment'
import type { Coupon, ValidateCouponResponse } from '../types/coupon'
import { formatInr, formatInrWhole } from '../lib/formatInr'
import { getApiErrorMessage } from '../lib/apiErrors'

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

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

function formatDateValue(d: Date) {
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

const legacyModeOptions: PaymentMode[] = ['Cash', 'Upi', 'Card']

type SettlementType = 'full' | 'partial'

const defaultCreate: CreatePaymentDto = {
  membershipId: 0,
  amount: 0,
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMode: 'Cash',
  receiptNo: '',
}

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'

const paymentIcons = {
  count: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  rupee: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  avg: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
}

export function PaymentsPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const canManagePayments = usePermission(authService.permissionCodes.payments)
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [form, setForm] = useState<CreatePaymentDto>(defaultCreate)
  const [settlementType, setSettlementType] = useState<SettlementType>('full')
  const [collectAmount, setCollectAmount] = useState('')
  const [collectDiscount, setCollectDiscount] = useState('')
  const [selectedCouponCode, setSelectedCouponCode] = useState('')
  const [couponValidation, setCouponValidation] = useState<ValidateCouponResponse | null>(null)
  const [collectMethod, setCollectMethod] = useState<MembershipPaymentMethod>('Cash')
  const [collectReference, setCollectReference] = useState('')
  const [collectNextDue, setCollectNextDue] = useState('')
  const [collectRemarks, setCollectRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null)
  const [invoiceAutoGenerated, setInvoiceAutoGenerated] = useState(false)
  const [reportFromDate, setReportFromDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [reportToDate, setReportToDate] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data } = await paymentsService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: enterpriseDash } = useQuery({
    queryKey: ['enterprise-billing-dashboard'],
    queryFn: async () => {
      const { data } = await membershipPaymentsService.enterpriseDashboard()
      return data
    },
    enabled: canManagePayments,
  })

  const { data: memberships = [] } = useQuery({
    queryKey: ['user-memberships'],
    queryFn: async () => {
      const { data } = await userMembershipsService.getAll()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: invoiceDetail, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', viewInvoiceId],
    queryFn: () => InvoicesService.getById(viewInvoiceId!),
    enabled: viewInvoiceId != null,
  })

  const pdfMutation = useMutation({
    mutationFn: (id: number) => InvoicesService.exportPdf(id),
    onSuccess: (blob, id) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  const ensureInvoiceMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const { data } = await paymentsService.ensureInvoice(paymentId)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      if (data.invoiceId) {
        setInvoiceAutoGenerated(true)
        setViewInvoiceId(data.invoiceId)
      }
    },
  })

  const selectedMembershipId = !editing ? form.membershipId : 0

  const { data: membershipBilling, isLoading: billingLoading } = useQuery({
    queryKey: ['membership-payment', selectedMembershipId],
    queryFn: async () => {
      const { data } = await membershipPaymentsService.byMembership(selectedMembershipId)
      return data
    },
    enabled: modalOpen && !editing && selectedMembershipId > 0,
  })

  const { data: activeCoupons = [] } = useQuery<Coupon[]>({
    queryKey: ['coupons-active'],
    queryFn: async () => {
      const { data } = await couponsService.getAll({ status: 'Active' })
      return data
    },
    enabled: modalOpen && !editing,
  })

  const billingNet = useMemo(() => {
    if (!membershipBilling) return 0
    return computeNetPayable(
      membershipBilling.totalAmount,
      membershipBilling.discountAmount,
      membershipBilling.waiverAmount,
      membershipBilling.netPayableAmount,
      membershipBilling.finalBillAmount,
      membershipBilling.couponDiscountAmount ?? 0,
    )
  }, [membershipBilling])

  const collectPaidNum = Number(collectAmount) || 0
  const remainingBeforePay = useMemo(() => {
    if (!membershipBilling) return 0
    return getRemainingBalance(membershipBilling)
  }, [membershipBilling])

  const collectPendingAfter = useMemo(() => {
    if (!membershipBilling) return 0
    return Math.max(0, remainingBeforePay - collectPaidNum)
  }, [membershipBilling, remainingBeforePay, collectPaidNum])

  const applyCouponMutation = useMutation({
    mutationFn: async (couponCode: string) => {
      if (!membershipBilling) throw new Error('No billing record')
      const { data } = await membershipPaymentsService.applyCoupon(membershipBilling.id, couponCode)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['membership-payment', selectedMembershipId], data)
      setCouponValidation({
        valid: true,
        discountAmount: data.couponDiscountAmount ?? 0,
        finalAmount: data.finalBillAmount ?? data.netPayableAmount ?? 0,
        message: 'Coupon applied and locked to invoice.',
        couponId: data.couponId,
        couponCode: data.couponCode,
      })
      toast.success('Coupon applied to invoice')
      applySettlementAmount(settlementType, data)
    },
    onError: (err: unknown) => {
      setCouponValidation({
        valid: false,
        discountAmount: 0,
        finalAmount: 0,
        message: getApiErrorMessage(err, 'Failed to apply coupon'),
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!membershipBilling) throw new Error('No membership billing record. Add the member with a plan first.')
      if (membershipBilling.paymentStatus === 'Paid' || remainingBeforePay <= 0.02) {
        throw new Error('This membership is already fully paid.')
      }
      const body = {
        amount: collectPaidNum,
        method: collectMethod,
        referenceNumber: collectReference.trim() || undefined,
        transactionDate: new Date(`${form.paymentDate}T12:00:00`).toISOString(),
        nextDueDate:
          collectPendingAfter > 0.02
            ? collectNextDue
              ? new Date(`${collectNextDue}T12:00:00`).toISOString()
              : undefined
            : undefined,
        remarks: collectRemarks.trim() || undefined,
      }
      const { data } = await membershipPaymentsService.addInstallment(membershipBilling.id, body)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['membership-payment'] })
      queryClient.invalidateQueries({ queryKey: ['user-memberships'] })
      setModalOpen(false)
      resetCollectForm()
      setFormError(null)
      const msg =
        data.paymentStatus === 'Paid' || data.isFullyPaid
          ? 'Full payment recorded. Membership is active.'
          : `Partial payment recorded. Pending ${formatInr(data.pendingAmount)}.`
      toast.success(msg)
      if (data.invoiceId) {
        setInvoiceAutoGenerated(true)
        setViewInvoiceId(data.invoiceId)
      }
    },
    onError: (err: unknown) => setFormError(getApiErrorMessage(err, 'Failed to record payment')),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: UpdatePaymentDto }) => {
      const { data } = await paymentsService.update(id, dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setEditing(null)
      setForm(defaultCreate)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to update payment'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  })

  const paymentStats = useMemo(() => {
    const total = payments.length
    const sum = payments.reduce((s, p) => s + p.amount, 0)
    const avg = total ? sum / total : 0
    return { total, sum, avg }
  }, [payments])

  const resetCollectForm = () => {
    setForm(defaultCreate)
    setSettlementType('full')
    setCollectAmount('')
    setCollectDiscount('')
    setSelectedCouponCode('')
    setCouponValidation(null)
    setCollectMethod('Cash')
    setCollectReference('')
    setCollectNextDue('')
    setCollectRemarks('')
  }

  const applySettlementAmount = (type: SettlementType, billing = membershipBilling) => {
    if (!billing) return
    if (type === 'full') {
      const remaining = getRemainingBalance(billing)
      setCollectAmount(String(Math.round(remaining * 100) / 100))
    } else {
      setCollectAmount('')
    }
  }

  const openAdd = () => {
    setEditing(null)
    resetCollectForm()
    setForm({
      ...defaultCreate,
      paymentDate: new Date().toISOString().slice(0, 10),
      receiptNo: getNextReceiptNo(),
    })
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (p: Payment) => {
    setEditing(p)
    setForm({
      membershipId: p.membershipId,
      amount: p.amount,
      paymentDate: p.paymentDate.slice(0, 10),
      paymentMode: p.paymentMode,
      receiptNo: p.receiptNo ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    resetCollectForm()
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!canManagePayments) {
      setFormError('You do not have permission to modify payments.')
      return
    }
    if (!editing && form.membershipId === 0) {
      setFormError('Please select a membership.')
      return
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        dto: {
          amount: form.amount,
          paymentDate: form.paymentDate,
          paymentMode: form.paymentMode,
          receiptNo: form.receiptNo?.trim() || undefined,
        },
      })
    } else {
      if (!membershipBilling) {
        setFormError('Select a membership with an open billing record.')
        return
      }
      if (collectPaidNum <= 0) {
        setFormError('Enter a payment amount greater than zero.')
        return
      }
      if (collectPaidNum - remainingBeforePay > 0.02) {
        setFormError(`Amount cannot exceed the remaining balance of ${formatInr(remainingBeforePay)}.`)
        return
      }
      if (collectPendingAfter > 0.02 && !collectNextDue) {
        setFormError('Next due date is required for partial payments.')
        return
      }
      createMutation.mutate()
    }
  }

  const handleDelete = (p: Payment) => {
    if (!window.confirm('Delete this payment record?')) return
    deleteMutation.mutate(p.id)
  }

  const membershipLabel = (membershipId: number) => {
    const m = memberships.find((x) => x.id === membershipId)
    return m ? `${m.userName ?? 'User'} — ${m.planName ?? 'Plan'}` : `#${membershipId}`
  }

  const getNextReceiptNo = () => {
    let max = 0
    for (const p of payments) {
      const r = (p.receiptNo ?? '').trim()
      const m = /^INV-(\d+)$/i.exec(r)
      if (!m) continue
      const n = Number(m[1])
      if (Number.isFinite(n) && n > max) max = n
    }
    return `INV-${String(max + 1).padStart(6, '0')}`
  }

  useEffect(() => {
    if (editing || !modalOpen || !form.membershipId) return
    if (membershipBilling) applySettlementAmount(settlementType, membershipBilling)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipBilling?.id, membershipBilling?.pendingAmount, settlementType, editing, modalOpen])

  const getMembershipDurationDays = (membershipId: number) => {
    const m = memberships.find((x) => x.id === membershipId)
    if (!m) return null
    const start = new Date(m.startDate)
    const end = new Date(m.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
    const ms = end.getTime() - start.getTime()
    const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
    return days
  }

  const getPaymentExpiryDate = (paymentDate: string, membershipId: number) => {
    const durationDays = getMembershipDurationDays(membershipId)
    if (!durationDays) return null
    const base = new Date(paymentDate)
    if (Number.isNaN(base.getTime())) return null
    const expiry = new Date(base)
    expiry.setDate(expiry.getDate() + durationDays)
    return expiry
  }

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportPayments = async (format: 'csv' | 'xls') => {
    const response =
      format === 'csv'
        ? await reportsService.exportPaymentsCsv(reportFromDate, reportToDate)
        : await reportsService.exportPaymentsXls(reportFromDate, reportToDate)
    downloadBlob(response.data, `payments-${reportFromDate}-${reportToDate}.${format}`)
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Billing"
        titleGradient="payments"
        subtitle="Record full or partial membership payments with installments, due dates, and invoices."
        primaryAction={canManagePayments ? { label: '+ Add payment', onClick: openAdd } : undefined}
        showExport={false}
      >
        {canManagePayments && (
          <div className="mb-2 flex flex-wrap gap-2">
            <Link
              to="/dashboard/payments/history"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              Payment history
            </Link>
            <Link
              to="/dashboard/payments/waive-offs"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              Waive-off requests
            </Link>
            <Link
              to="/dashboard/payments/reports"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              Billing reports
            </Link>
          </div>
        )}

        {enterpriseDash && (
          <div className="mb-4 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              title="Outstanding dues"
              value={formatInrWhole(enterpriseDash.outstandingDues)}
              gradient="from-amber-500 to-orange-600"
              icon={paymentIcons.rupee}
              caption={`${enterpriseDash.overdueMembersCount} overdue`}
            />
            <MetricCard
              title="Today's collections"
              value={formatInrWhole(enterpriseDash.dailyCollections)}
              gradient="from-emerald-400 to-teal-500"
              icon={paymentIcons.rupee}
              caption="Completed payments only"
            />
            <MetricCard
              title="Pending waive-offs"
              value={String(enterpriseDash.pendingWaiveOffRequests)}
              gradient="from-violet-500 to-fuchsia-500"
              icon={paymentIcons.count}
              caption="Awaiting admin approval"
            />
            <MetricCard
              title="Voided / refunded"
              value={`${enterpriseDash.voidedPaymentsCount} / ${enterpriseDash.refundedPaymentsCount}`}
              gradient="from-slate-500 to-slate-700"
              icon={paymentIcons.avg}
              caption="Audit preserved"
            />
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Transactions"
            value={paymentStats.total}
            gradient="from-blue-500 to-indigo-500"
            icon={paymentIcons.count}
            caption="Recorded payments"
          />
          <MetricCard
            title="Total collected"
            value={paymentStats.total ? formatInrWhole(paymentStats.sum) : '—'}
            gradient="from-emerald-400 to-teal-500"
            icon={paymentIcons.rupee}
            caption="Sum of all amounts"
          />
          <MetricCard
            title="Average ticket"
            value={paymentStats.total ? formatInrWhole(paymentStats.avg) : '—'}
            gradient="from-violet-500 to-fuchsia-500"
            icon={paymentIcons.avg}
            caption="Per payment"
          />
        </div>

        <DashboardTablePanel
          title="Payment log"
          description="Each new payment generates a paid invoice (INR) linked to the membership. Use the Invoice button to open the receipt."
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={reportFromDate}
                onChange={(e) => setReportFromDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200"
              />
              <input
                type="date"
                value={reportToDate}
                onChange={(e) => setReportToDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200"
              />
              <button
                type="button"
                onClick={() => {
                  void exportPayments('csv')
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  void exportPayments('xls')
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Export XLS
              </button>
            </div>
          }
        >
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading…</p>
          ) : payments.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No payments yet. Add one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3 font-medium">Membership</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Expiry</th>
                    <th className="px-6 py-3 font-medium">Mode</th>
                    <th className="px-6 py-3 font-medium">Receipt no.</th>
                    <th className="px-6 py-3 font-medium">Invoice</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="max-w-[180px] truncate px-6 py-3 text-slate-300">
                        {membershipLabel(p.membershipId)}
                      </td>
                      <td className="px-6 py-3 font-medium text-white">{formatInr(p.amount)}</td>
                      <td className="px-6 py-3 text-slate-300">{formatDate(p.paymentDate)}</td>
                      <td className="px-6 py-3 text-slate-300">
                        {(() => {
                          const expiry = getPaymentExpiryDate(p.paymentDate, p.membershipId)
                          return expiry ? formatDateValue(expiry) : '—'
                        })()}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-sky-500/30">
                          {p.paymentMode}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-300">{p.receiptNo ?? '—'}</td>
                      <td className="px-6 py-3">
                        {!canManagePayments ? (
                          <span className="text-xs text-slate-500">No access</span>
                        ) : p.invoiceId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceAutoGenerated(false)
                              setViewInvoiceId(p.invoiceId!)
                            }}
                            className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 transition hover:border-emerald-300/50 hover:bg-emerald-500/20 hover:text-emerald-200"
                          >
                            Invoice
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => ensureInvoiceMutation.mutate(p.id)}
                            disabled={ensureInvoiceMutation.isPending}
                            className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 transition hover:border-amber-300/50 hover:bg-amber-500/20 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Generate
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {canManagePayments ? (
                          <span className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="text-sm text-blue-300 transition hover:text-blue-200 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="text-sm text-rose-300 transition hover:text-rose-200 hover:underline"
                            >
                              Delete
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">No access</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit payment' : 'Record Payment'} size="wide" scrollable>
        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
          {!canManagePayments && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              You do not have permission to modify payments.
            </p>
          )}
          {formError && (
            <p className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
              {formError}
            </p>
          )}
          {!editing && (
            <div className="space-y-5">
              {/* ─── STEP 1: Select Membership ─── */}
              <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <span className="flex size-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">1</span>
                  Select Membership
                </h3>
                <select
                  value={form.membershipId}
                  onChange={(e) => {
                    const membershipId = Number(e.target.value)
                    setForm((f) => ({ ...f, membershipId }))
                    setCollectAmount('')
                    setCollectNextDue('')
                    setSelectedCouponCode('')
                    setCouponValidation(null)
                  }}
                  className={selectClass}
                  required
                >
                  <option value={0} className="bg-slate-900">Select membership</option>
                  {memberships.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900">
                      {m.userName ?? 'User'} — {m.planName ?? 'Plan'} ({m.startDate} to {m.endDate})
                      {m.status ? ` · ${m.status}` : ''}
                    </option>
                  ))}
                </select>
              </section>

              {form.membershipId > 0 && billingLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="size-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                  <span className="ml-2 text-sm text-slate-400">Loading billing…</span>
                </div>
              )}
              {form.membershipId > 0 && !billingLoading && !membershipBilling && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  Could not load billing.{' '}
                  <button type="button" className="font-semibold text-rose-100 underline"
                    onClick={() => { const m = memberships.find((x) => x.id === form.membershipId); if (m?.userId) navigate(`/dashboard/payments/collect?membershipId=${form.membershipId}&userId=${m.userId}`) }}>
                    Open full billing page →
                  </button>
                </p>
              )}
              {membershipBilling && (
                <>
                  {/* ─── STEP 2: Billing Summary ─── */}
                  <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                      <span className="flex size-5 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">2</span>
                      Billing Summary
                      <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${paymentStatusBadgeClass(membershipBilling.paymentStatus)}`}>
                        {paymentStatusLabel(membershipBilling.paymentStatus)}
                      </span>
                    </h3>
                    <BillingSummaryCard
                      membershipAmount={getMembershipAmount(membershipBilling)}
                      couponCode={membershipBilling.couponCode}
                      couponDiscount={membershipBilling.couponDiscountAmount ?? 0}
                      manualDiscount={membershipBilling.discountAmount}
                      waiverAmount={membershipBilling.waiverAmount}
                      finalBilling={billingNet}
                      paidAmount={membershipBilling.paidAmount}
                      pendingAmount={remainingBeforePay}
                      couponLocked={membershipBilling.couponLocked}
                    />
                  </section>

              {membershipBilling && remainingBeforePay > 0.02 && (
                <>
                  {/* ─── STEP 3: Coupon / Discount ─── */}
                  <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">3</span>
                      Apply Discount / Coupon
                    </h3>
                    <select
                      value={selectedCouponCode}
                      disabled={
                        membershipBilling.couponLocked ||
                        membershipBilling.paidAmount > 0 ||
                        applyCouponMutation.isPending
                      }
                      onChange={(e) => {
                        const code = e.target.value
                        setSelectedCouponCode(code)
                        setCollectDiscount('')
                        setCouponValidation(null)
                        if (code && code !== '__manual__' && membershipBilling) {
                          const m = memberships.find((x) => x.id === form.membershipId)
                          couponsService
                            .validate({
                              couponCode: code,
                              membershipPlanId: m?.planId ?? 0,
                              invoiceAmount: getMembershipAmount(membershipBilling),
                              userId: membershipBilling.userId,
                              membershipPaymentId: membershipBilling.id,
                            })
                            .then(({ data }) => {
                              if (!data.valid) {
                                setCouponValidation(data)
                                return
                              }
                              applyCouponMutation.mutate(code)
                            })
                            .catch(() => {
                              setCouponValidation({ valid: false, discountAmount: 0, finalAmount: 0, message: 'Validation failed' })
                            })
                        }
                      }}
                      className={selectClass}
                    >
                      <option value="" className="bg-slate-900">No discount</option>
                      <option value="__manual__" className="bg-slate-900">Manual discount (₹)</option>
                      {activeCoupons.map((c) => (
                        <option key={c.id} value={c.couponCode} className="bg-slate-900">
                          {c.couponCode} — {c.discountType === 'Percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                          {c.maximumDiscountAmount ? ` (max ₹${c.maximumDiscountAmount})` : ''}
                          {' · '}{c.couponName}
                        </option>
                      ))}
                    </select>

                    {/* Manual discount input */}
                    {selectedCouponCode === '__manual__' && (
                      <div className="mt-2">
                        <Input
                          label="Manual Discount Amount (₹)"
                          type="number"
                          min={0}
                          step={0.01}
                          value={collectDiscount}
                          onChange={(e) => {
                            setCollectDiscount(e.target.value)
                            setCouponValidation(null)
                          }}
                          placeholder="Enter discount amount"
                        />
                      </div>
                    )}

                    {/* Coupon validation result */}
                    {selectedCouponCode && selectedCouponCode !== '__manual__' && couponValidation && (
                      <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                        couponValidation.valid
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                      }`}>
                        {couponValidation.valid ? (
                          <div className="space-y-1">
                            <p className="font-semibold">✓ Coupon applied: {couponValidation.couponCode}</p>
                            <p>Discount: <span className="font-bold">{formatInr(couponValidation.discountAmount)}</span></p>
                          </div>
                        ) : (
                          <p>✗ {couponValidation.message}</p>
                        )}
                      </div>
                    )}

                    {membershipBilling.couponLocked && membershipBilling.couponCode && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-rose-300 underline"
                        disabled={membershipBilling.paidAmount > 0}
                        onClick={async () => {
                          try {
                            const { data } = await membershipPaymentsService.removeCoupon(membershipBilling.id)
                            queryClient.setQueryData(['membership-payment', selectedMembershipId], data)
                            setSelectedCouponCode('')
                            setCouponValidation(null)
                            toast.success('Coupon removed')
                          } catch (err: unknown) {
                            toast.error(getApiErrorMessage(err, 'Cannot remove coupon'))
                          }
                        }}
                      >
                        Remove coupon (before first payment only)
                      </button>
                    )}

                    {/* Show calculated discount summary */}
                    {(membershipBilling.couponDiscountAmount ?? 0) > 0 && (
                      <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                        <span>Discount applied</span>
                        <span className="font-semibold text-emerald-300">
                          −{formatInr(membershipBilling.couponDiscountAmount ?? 0)}
                        </span>
                      </div>
                    )}
                  </section>

                  {/* ─── STEP 4: Payment Details ─── */}
                  <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                      <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">4</span>
                      Payment Details
                    </h3>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {(['full', 'partial'] as SettlementType[]).map((t) => (
                        <button key={t} type="button"
                          onClick={() => { setSettlementType(t); applySettlementAmount(t, membershipBilling) }}
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                            settlementType === t
                              ? t === 'full' ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100' : 'border-amber-400/50 bg-amber-500/20 text-amber-100'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}>
                          {t === 'full' ? '💰 Full payment' : '📋 Partial'}
                        </button>
                      ))}
                    </div>
                    {settlementType === 'partial' && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {[25, 50, 75].map((pct) => (
                          <button key={pct} type="button"
                            onClick={() => setCollectAmount(String(Math.round(remainingBeforePay * (pct / 100) * 100) / 100))}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10">
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label={settlementType === 'full' ? 'Amount (₹) — full balance' : 'Amount (₹)'} type="number" min={0} step={0.01} value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} disabled={settlementType === 'full'} required />
                      <Input label="Payment date" type="date" value={form.paymentDate.slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} required />
                      <div>
                        <label className={labelClass}>Payment method</label>
                        <select value={collectMethod} onChange={(e) => setCollectMethod(e.target.value as MembershipPaymentMethod)} className={selectClass}>
                          {MEMBERSHIP_PAYMENT_METHODS.map((mode) => (<option key={mode} value={mode} className="bg-slate-900">{mode}</option>))}
                        </select>
                      </div>
                      <Input label="Reference / Txn ID" value={collectReference} onChange={(e) => setCollectReference(e.target.value)} placeholder="Optional" />
                    </div>
                    {collectPendingAfter > 0.02 && (
                      <div className="mt-3"><Input label="Next due date (required for partial)" type="date" value={collectNextDue} onChange={(e) => setCollectNextDue(e.target.value)} required /></div>
                    )}
                    <div className="mt-3">
                      <Input label="Notes" value={collectRemarks} onChange={(e) => setCollectRemarks(e.target.value)} placeholder="Optional remarks" />
                    </div>
                    {/* Final calculation */}
                    <div className="mt-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Paying now</span>
                        <span className="font-bold text-white text-sm">{formatInr(collectPaidNum)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                        <span>Remaining after</span>
                        <span className={`font-semibold ${collectPendingAfter <= 0.02 ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {collectPendingAfter <= 0.02 ? '₹0 (Full settlement ✓)' : formatInr(collectPendingAfter)}
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              )}
              </>
              )}
            </div>
          )}

          {editing && (
            <div className="space-y-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Amount (₹)" type="number" min={0} step={0.01} value={form.amount === 0 ? '' : String(form.amount)} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))} required />
                <Input label="Payment date" type="date" value={form.paymentDate.slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} required />
                <div>
                  <label className={labelClass}>Payment mode</label>
                  <select value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value as PaymentMode }))} className={selectClass}>
                    {legacyModeOptions.map((mode) => (<option key={mode} value={mode} className="bg-slate-900">{mode}</option>))}
                  </select>
                </div>
                <Input label="Receipt no." value={form.receiptNo ?? ''} onChange={(e) => setForm((f) => ({ ...f, receiptNo: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
          )}
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={!canManagePayments || createMutation.isPending || updateMutation.isPending || (!editing && (!membershipBilling || remainingBeforePay <= 0.02 || billingLoading))}>
              {editing ? 'Update' : '💳 Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={viewInvoiceId != null}
        onClose={() => {
          setViewInvoiceId(null)
          setInvoiceAutoGenerated(false)
        }}
        title={invoiceDetail ? `Invoice ${invoiceDetail.invoiceNumber}` : 'Invoice'}
        size="wide"
        scrollable
      >
        {invoiceLoading && <p className="text-sm text-slate-400">Loading invoice…</p>}
        {!invoiceLoading && invoiceDetail && (
          <InvoiceReceiptBody
            invoice={invoiceDetail}
            autoGenerated={invoiceAutoGenerated}
            onClose={() => {
              setViewInvoiceId(null)
              setInvoiceAutoGenerated(false)
            }}
            onDownloadPdf={() => pdfMutation.mutate(invoiceDetail.id)}
            pdfPending={pdfMutation.isPending}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
}

function InvoiceReceiptBody({
  invoice,
  autoGenerated,
  onClose,
  onDownloadPdf,
  pdfPending,
}: {
  invoice: Invoice
  autoGenerated: boolean
  onClose: () => void
  onDownloadPdf: () => void
  pdfPending: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        <span className="font-semibold text-white">Paid</span>
        {' — '}
        This receipt was generated automatically when the payment was recorded.
        {autoGenerated && (
          <span className="ml-2 inline-flex items-center rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            Auto-generated
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Member</p>
          <p className="font-medium text-white">{invoice.customerName ?? '—'}</p>
          <p className="text-sm text-slate-400">{invoice.customerEmail ?? ''}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Status</p>
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/15">
            {invoice.status}
          </span>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Issue date</p>
          <p className="text-slate-200">{formatDate(invoice.issueDate)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Paid date</p>
          <p className="text-slate-200">{invoice.paidDate ? formatDate(invoice.paidDate) : '—'}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white">Line items</h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 text-center font-medium">Qty</th>
                <th className="px-4 py-2 text-center font-medium">Unit</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 text-slate-200">
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-center">{item.unit}</td>
                  <td className="px-4 py-3 text-right">{formatInr(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium text-white">{formatInr(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
        <div className="flex justify-between text-sm text-slate-300">
          <span>Subtotal</span>
          <span className="text-white">{formatInr(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Tax</span>
          <span className="text-white">{formatInr(invoice.taxAmount)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Discount</span>
          <span className="text-white">−{formatInr(invoice.discountAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-bold text-white">
          <span>Total</span>
          <span className="text-emerald-300">{formatInr(invoice.totalAmount)}</span>
        </div>
      </div>

      {invoice.notes && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">Notes</p>
          <p className="whitespace-pre-wrap text-sm text-slate-300">{invoice.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={onDownloadPdf} disabled={pdfPending} isLoading={pdfPending}>
          Download PDF
        </Button>
      </div>
    </div>
  )
}
