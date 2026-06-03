import { useState } from 'react'

import { Link } from 'react-router-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import toast from 'react-hot-toast'

import { DashboardLayout } from '../components/layout/DashboardLayout'

import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'

import { MembershipAuditTrail } from '../components/memberships/MembershipAuditTrail'

import { Button } from '../components/ui/Button'

import { Modal } from '../components/ui/Modal'

import { Input } from '../components/ui/Input'

import { membershipApprovalRequestsService } from '../services/membershipApprovalRequests.service'

import { formatInr } from '../lib/formatInr'

import { getApiErrorMessage } from '../lib/apiErrors'

import { usePermission } from '../features/auth/hooks/usePermission'

import { authService } from '../services/auth.service'

import type { MembershipApprovalRequest } from '../types/membershipLifecycle'



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

  const d = new Date(iso)

  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()

}



const requestTypeLabel: Record<string, string> = {

  Void: 'Void',

  Cancel: 'Cancel',

  Edit: 'Edit',

  DateChange: 'Date change',

  PlanChange: 'Plan change',

  FeeChange: 'Fee change',

  Transfer: 'Transfer',

}



export function MembershipApprovalRequestsPage() {

  const { userName } = getDashboardUser()

  const canPay = usePermission(authService.permissionCodes.payments)

  const canApprove = authService.canApproveMembershipRequest()

  const canViewAudit = authService.canViewMembershipAudit()

  const queryClient = useQueryClient()

  const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending')

  const [search, setSearch] = useState('')

  const [viewRow, setViewRow] = useState<MembershipApprovalRequest | null>(null)

  const [approveId, setApproveId] = useState<number | null>(null)

  const [rejectId, setRejectId] = useState<number | null>(null)

  const [adminRemarks, setAdminRemarks] = useState('')



  const { data: rows = [], isLoading } = useQuery({

    queryKey: ['membership-approval-requests', filter, search],

    queryFn: async () => {

      const { data } = await membershipApprovalRequestsService.list(filter, search)

      return Array.isArray(data) ? data : []

    },

    enabled: canPay,

  })



  const invalidateAll = () => {

    queryClient.invalidateQueries({ queryKey: ['membership-approval-requests'] })

    queryClient.invalidateQueries({ queryKey: ['user-memberships'] })

    queryClient.invalidateQueries({ queryKey: ['membership-audit'] })

  }



  const approveMutation = useMutation({

    mutationFn: () => membershipApprovalRequestsService.approve(approveId!, adminRemarks),

    onSuccess: () => {

      toast.success('Request approved — membership updated')

      setApproveId(null)

      setViewRow(null)

      setAdminRemarks('')

      invalidateAll()

    },

    onError: (e) => toast.error(getApiErrorMessage(e, 'Approval failed')),

  })



  const rejectMutation = useMutation({

    mutationFn: () => membershipApprovalRequestsService.reject(rejectId!, adminRemarks),

    onSuccess: () => {

      toast.success('Request rejected')

      setRejectId(null)

      setViewRow(null)

      setAdminRemarks('')

      invalidateAll()

    },

    onError: (e) => toast.error(getApiErrorMessage(e, 'Rejection failed')),

  })



  const openApprove = (id: number) => {

    setApproveId(id)

    setRejectId(null)

    setAdminRemarks('')

  }



  const openReject = (id: number) => {

    setRejectId(id)

    setApproveId(null)

    setAdminRemarks('')

  }



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

        eyebrow="Memberships"

        titleGradient="approval requests"

        subtitle="Approve void/cancel requests to mark duplicates as Voided (hidden from the main membership list). Audit trail shows who created each record."

      >

        {!canApprove ? (

          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">

            You can view requests but cannot approve them. Sign in as an admin account, or ask an admin to grant{' '}

            <span className="font-mono text-xs">APPROVE_MEMBERSHIP_REQUEST</span> (ADMIN role includes this after

            re-login).

          </p>

        ) : null}



        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex flex-wrap gap-2">

            {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((s) => (

              <button

                key={s}

                type="button"

                onClick={() => setFilter(s)}

                className={`rounded-full border px-3 py-1 text-xs font-medium ${

                  filter === s

                    ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'

                    : 'border-white/10 text-slate-400'

                }`}

              >

                {s}

              </button>

            ))}

          </div>

          <Input

            placeholder="Search member, membership or request #"

            value={search}

            onChange={(e) => setSearch(e.target.value)}

            className="max-w-xs"

          />

        </div>



        <div className="overflow-x-auto rounded-xl border border-white/10">

          <table className="w-full min-w-[900px] text-left text-sm">

            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-slate-400">

              <tr>

                <th className="px-4 py-3">Request #</th>

                <th className="px-4 py-3">Member</th>

                <th className="px-4 py-3">Plan</th>

                <th className="px-4 py-3">Type</th>

                <th className="px-4 py-3">Reason</th>

                <th className="px-4 py-3">Requested by</th>

                <th className="px-4 py-3">Date</th>

                <th className="px-4 py-3">Status</th>

                <th className="px-4 py-3 text-right">Actions</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-white/5">

              {isLoading ? (

                <tr>

                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">

                    Loading…

                  </td>

                </tr>

              ) : rows.length === 0 ? (

                <tr>

                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">

                    No requests found.

                  </td>

                </tr>

              ) : (

                rows.map((row) => (

                  <tr key={row.id} className="hover:bg-white/[0.03]">

                    <td className="px-4 py-3 font-mono text-slate-300">#{row.id}</td>

                    <td className="px-4 py-3">

                      <div className="flex items-center gap-2">

                        {row.memberPhotoUrl ? (

                          <img

                            src={row.memberPhotoUrl}

                            alt=""

                            className="size-8 rounded-full object-cover"

                          />

                        ) : (

                          <div className="flex size-8 items-center justify-center rounded-full bg-slate-700 text-xs text-white">

                            {(row.memberName ?? '?').charAt(0)}

                          </div>

                        )}

                        <Link

                          to={`/dashboard/users/${row.memberId}`}

                          className="text-blue-300 hover:text-blue-200 hover:underline"

                        >

                          {row.memberName ?? `User #${row.memberId}`}

                        </Link>

                      </div>

                    </td>

                    <td className="px-4 py-3 text-slate-300">{row.planName ?? '—'}</td>

                    <td className="px-4 py-3">{requestTypeLabel[row.requestType] ?? row.requestType}</td>

                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-400" title={row.reason}>

                      {row.reason}

                    </td>

                    <td className="px-4 py-3 text-slate-300">{row.requestedByName ?? row.requestedByUserId}</td>

                    <td className="px-4 py-3 text-slate-400">{formatDate(row.requestedDate)}</td>

                    <td className="px-4 py-3">

                      <span

                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${

                          row.status === 'Pending'

                            ? 'bg-amber-500/20 text-amber-200'

                            : row.status === 'Approved'

                              ? 'bg-emerald-500/20 text-emerald-200'

                              : 'bg-red-500/20 text-red-200'

                        }`}

                      >

                        {row.status}

                      </span>

                    </td>

                    <td className="px-4 py-3 text-right">

                      <div className="flex flex-wrap justify-end gap-1">

                        <Button type="button" variant="ghost" size="sm" onClick={() => setViewRow(row)}>

                          View

                        </Button>

                        {canApprove && row.status === 'Pending' ? (

                          <>

                            <Button

                              type="button"

                              variant="primary"

                              size="sm"

                              onClick={() => openApprove(row.id)}

                            >

                              Approve

                            </Button>

                            <Button

                              type="button"

                              variant="outline"

                              size="sm"

                              onClick={() => openReject(row.id)}

                            >

                              Reject

                            </Button>

                          </>

                        ) : null}

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </DashboardSubpageShell>



      <Modal open={viewRow != null} onClose={() => setViewRow(null)} title="Request details" size="wide">

        {viewRow ? (

          <>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">

              <div>

                <dt className="text-slate-500">Request #</dt>

                <dd>{viewRow.id}</dd>

              </div>

              <div>

                <dt className="text-slate-500">Membership #</dt>

                <dd>{viewRow.membershipId}</dd>

              </div>

              <div>

                <dt className="text-slate-500">Member</dt>

                <dd>

                  <Link

                    to={`/dashboard/users/${viewRow.memberId}`}

                    className="text-blue-300 hover:underline"

                  >

                    {viewRow.memberName}

                  </Link>

                </dd>

              </div>

              <div>

                <dt className="text-slate-500">Plan</dt>

                <dd>{viewRow.planName}</dd>

              </div>

              <div>

                <dt className="text-slate-500">Request type</dt>

                <dd>{requestTypeLabel[viewRow.requestType] ?? viewRow.requestType}</dd>

              </div>

              <div>

                <dt className="text-slate-500">Requested by</dt>

                <dd>{viewRow.requestedByName ?? viewRow.requestedByUserId}</dd>

              </div>

              <div>

                <dt className="text-slate-500">Fee / Paid / Outstanding</dt>

                <dd>

                  {formatInr(viewRow.membershipFee ?? 0)} / {formatInr(viewRow.totalPaid ?? 0)} /{' '}

                  {formatInr(viewRow.outstandingBalance ?? 0)}

                </dd>

              </div>

              <div className="sm:col-span-2">

                <dt className="text-slate-500">Reason</dt>

                <dd className="text-slate-200">{viewRow.reason}</dd>

              </div>

              {viewRow.requestType === 'Void' && viewRow.status === 'Pending' ? (

                <div className="sm:col-span-2 text-sm text-emerald-200/90">

                  Approving will set this membership to <strong>Voided</strong>. It will leave the main membership

                  list (records are kept for audit, not physically deleted).

                </div>

              ) : null}

              {viewRow.hasPaymentRecords ? (

                <div className="sm:col-span-2 text-amber-200">

                  This membership has payment records (preserved if void is approved).

                </div>

              ) : null}

            </dl>



            {canViewAudit ? (

              <MembershipAuditTrail membershipId={viewRow.membershipId} title="Who did what (this membership)" />

            ) : null}



            {canApprove && viewRow.status === 'Pending' ? (

              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">

                <Button type="button" variant="outline" onClick={() => openReject(viewRow.id)}>

                  Reject

                </Button>

                <Button type="button" variant="primary" onClick={() => openApprove(viewRow.id)}>

                  Approve void

                </Button>

              </div>

            ) : null}

          </>

        ) : null}

      </Modal>



      <Modal open={approveId != null} onClose={() => setApproveId(null)} title="Approve request">

        <p className="mb-3 text-sm text-slate-300">

          Confirm approval? Void requests mark the membership <strong>Voided</strong> and remove it from the active

          membership list.

        </p>

        <Input

          label="Admin remarks (optional)"

          value={adminRemarks}

          onChange={(e) => setAdminRemarks(e.target.value)}

        />

        <div className="mt-4 flex justify-end gap-2">

          <Button type="button" variant="ghost" onClick={() => setApproveId(null)}>

            Cancel

          </Button>

          <Button

            type="button"

            variant="primary"

            isLoading={approveMutation.isPending}

            onClick={() => {

              if (!window.confirm('Approve this membership request?')) return

              approveMutation.mutate()

            }}

          >

            Approve

          </Button>

        </div>

      </Modal>



      <Modal open={rejectId != null} onClose={() => setRejectId(null)} title="Reject request">

        <p className="mb-3 text-sm text-slate-300">

          Reject this request? Void-pending memberships will revert to their previous status.

        </p>

        <Input

          label="Admin remarks (optional)"

          value={adminRemarks}

          onChange={(e) => setAdminRemarks(e.target.value)}

        />

        <div className="mt-4 flex justify-end gap-2">

          <Button type="button" variant="ghost" onClick={() => setRejectId(null)}>

            Cancel

          </Button>

          <Button

            type="button"

            variant="outline"

            isLoading={rejectMutation.isPending}

            onClick={() => {

              if (!window.confirm('Reject this membership request?')) return

              rejectMutation.mutate()

            }}

          >

            Reject

          </Button>

        </div>

      </Modal>

    </DashboardLayout>

  )

}


