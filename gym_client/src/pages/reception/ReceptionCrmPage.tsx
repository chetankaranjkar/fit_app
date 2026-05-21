import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { LeadSourceCombobox } from '../../components/reception/LeadSourceCombobox'
import { formatLeadSourceDisplay, resolveLeadSourceForForm } from '../../lib/leadSources'
import { authService } from '../../services/auth.service'
import { leadsService } from '../../services/leads.service'
import { getDashboardUser } from '../../lib/dashboardUser'
import type { CreateGymLeadDto, GymLeadDetail, LeadPipelineStatus } from '../../types/leads'

const STATUS_ORDER: LeadPipelineStatus[] = [
  'NEW',
  'CONTACTED',
  'FOLLOWUP',
  'TRIAL',
  'INTERESTED',
  'NOT_INTERESTED',
  'CONVERTED',
]

const STATUS_LABEL: Record<LeadPipelineStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  FOLLOWUP: 'Follow-up',
  TRIAL: 'Trial',
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not interested',
  CONVERTED: 'Converted',
}

function statusAccent(status: LeadPipelineStatus): string {
  switch (status) {
    case 'NEW':
      return 'from-cyan-500/30 to-blue-600/20 border-cyan-400/25'
    case 'CONTACTED':
      return 'from-violet-500/25 to-fuchsia-600/15 border-violet-400/20'
    case 'FOLLOWUP':
      return 'from-amber-500/25 to-orange-600/15 border-amber-400/25'
    case 'TRIAL':
      return 'from-emerald-500/25 to-teal-600/15 border-emerald-400/20'
    case 'INTERESTED':
      return 'from-pink-500/25 to-rose-600/15 border-pink-400/20'
    case 'NOT_INTERESTED':
      return 'from-slate-500/20 to-slate-600/10 border-slate-500/20'
    case 'CONVERTED':
      return 'from-green-500/30 to-lime-600/15 border-emerald-400/30'
    default:
      return 'from-slate-600/20 to-slate-800/10 border-white/10'
  }
}

function formatInr(n: number) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
  } catch {
    return `₹${n}`
  }
}

export function ReceptionCrmPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const canCrm = authService.hasPermission('LEADS_CRM')
  const canTrainer = authService.hasPermission('LEADS_TRAINER')
  const canConvert = authService.hasPermission('CREATE_MEMBER')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [followOpen, setFollowOpen] = useState(false)
  const [trialOpen, setTrialOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [editLeadOpen, setEditLeadOpen] = useState(false)

  const canAccess = canCrm || canTrainer

  const dashboardQ = useQuery({
    queryKey: ['leads', 'reception-dashboard'],
    queryFn: async () => (await leadsService.getReceptionDashboard()).data,
    enabled: canCrm,
  })

  const now = new Date()
  const analyticsQ = useQuery({
    queryKey: ['leads', 'analytics', now.getFullYear(), now.getMonth() + 1],
    queryFn: async () =>
      (await leadsService.getAnalytics(now.getFullYear(), now.getMonth() + 1)).data,
    enabled: canCrm,
  })

  const kanbanQ = useQuery({
    queryKey: ['leads', 'kanban'],
    queryFn: async () => (await leadsService.getKanban()).data,
    enabled: canCrm || canTrainer,
  })

  const detailQ = useQuery({
    queryKey: ['leads', 'detail', selectedId],
    queryFn: async () => (await leadsService.getById(selectedId!)).data,
    enabled: selectedId != null && (canCrm || canTrainer),
  })

  const plansQ = useQuery({
    queryKey: ['leads', 'conversion-plans'],
    queryFn: async () => (await leadsService.conversionPlans()).data,
    enabled: canCrm && convertOpen,
  })

  const trainersQ = useQuery({
    queryKey: ['leads', 'trainer-options'],
    queryFn: async () => (await leadsService.trainerOptions()).data,
    enabled: canCrm && (trialOpen || convertOpen || selectedId != null),
  })

  const invalidateKanban = () => void qc.invalidateQueries({ queryKey: ['leads', 'kanban'] })

  const setStatusMu = useMutation({
    mutationFn: ({ id, status }: { id: number; status: LeadPipelineStatus }) =>
      leadsService.setStatus(id, status),
    onSuccess: () => {
      invalidateKanban()
      void qc.invalidateQueries({ queryKey: ['leads', 'detail', selectedId] })
    },
  })

  const leadDetail = detailQ.data

  const chartData = useMemo(() => {
    const grouped = analyticsQ.data?.groupedLeadSources
    const legacy = analyticsQ.data?.leadSources ?? []
    const rows = grouped?.length ? grouped : legacy
    return rows.map((s) => ({
      name: s.source.length > 14 ? s.source.slice(0, 13) + '…' : s.source,
      count: s.count,
    }))
  }, [analyticsQ.data?.groupedLeadSources, analyticsQ.data?.leadSources])

  if (!canAccess) {
    return (
      <DashboardLayout userName={userName}>
        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
          <p className="text-lg font-medium text-white">Lead CRM</p>
          <p className="mt-2 text-sm text-slate-400">
            You don’t have access. Ask an admin to assign <strong>LEADS_CRM</strong> or{' '}
            <strong>LEADS_TRAINER</strong>.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-[1800px] space-y-8 pb-16 pt-2">
          <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/90 via-blue-950/40 to-violet-950/30 p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-10 size-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/80">Reception</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Lead CRM</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Inquiry → follow-up → trial → membership. Dark glass workspace with a live pipeline.
              </p>
              {canCrm && (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Today's leads", value: dashboardQ.data?.todaysLeads ?? '—', neon: 'text-cyan-300' },
                    { label: "Today's admissions", value: dashboardQ.data?.todaysAdmissions ?? '—', neon: 'text-emerald-300' },
                    { label: 'Pending follow-ups', value: dashboardQ.data?.pendingFollowUps ?? '—', neon: 'text-amber-300' },
                    { label: 'Active members', value: dashboardQ.data?.activeMembers ?? '—', neon: 'text-violet-300' },
                    { label: 'Expiring (7d)', value: dashboardQ.data?.expiringMemberships ?? '—', neon: 'text-rose-300' },
                  ].map((s) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur-xl"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
                      <p className={`mt-2 text-2xl font-bold tabular-nums ${s.neon}`}>{s.value}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {canCrm && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white" onClick={() => setNewLeadOpen(true)}>
                    New lead
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/dashboard/users', { state: { openAddMember: true } })}
                  >
                    New admission
                  </Button>
                  <Link
                    to="/dashboard/access/scan"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Scan QR
                  </Link>
                  <Link
                    to="/dashboard/user-memberships"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Renew membership
                  </Link>
                </div>
              )}
            </div>
          </header>

          {canCrm && analyticsQ.data && (
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl lg:col-span-2">
                <h2 className="text-sm font-medium text-slate-400">Lead sources · this month</h2>
                <div className="mt-4 h-64 w-full">
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(56,189,248,0.08)' }}
                          contentStyle={{
                            background: 'rgba(12,12,24,0.94)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 12,
                          }}
                          labelStyle={{ color: '#e2e8f0' }}
                        />
                        <Bar dataKey="count" fill="url(#barNeon)" radius={[6, 6, 0, 0]} />
                        <defs>
                          <linearGradient id="barNeon" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.5} />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="flex h-full items-center justify-center text-sm text-slate-500">No source data yet.</p>
                  )}
                </div>
                {(analyticsQ.data?.otherSourceDetails?.length ?? 0) > 0 && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-200/85">Other details</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Custom and secondary channels in the &quot;Other&quot; bucket.</p>
                    <ul className="mt-3 max-h-36 space-y-2 overflow-y-auto text-sm">
                      {(analyticsQ.data?.otherSourceDetails ?? []).map((row) => (
                        <li key={row.source} className="flex justify-between gap-2 text-slate-300">
                          <span className="min-w-0 truncate" title={row.source}>
                            {row.source}
                          </span>
                          <span className="shrink-0 tabular-nums text-cyan-300">{row.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <h2 className="text-sm font-medium text-slate-400">Conversion pulse</h2>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase text-emerald-200/80">All-time rate</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {analyticsQ.data.conversionRatePercent.toFixed(1)}%
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-slate-500">New leads</p>
                    <p className="mt-1 text-lg font-semibold text-white">{analyticsQ.data.newLeadsInMonth}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-slate-500">Admissions</p>
                    <p className="mt-1 text-lg font-semibold text-white">{analyticsQ.data.admissionsInMonth}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-slate-500">Trainer impact</p>
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
                    {(analyticsQ.data.trainerStats ?? []).map((t) => (
                      <li key={t.trainerId} className="flex justify-between gap-2 text-slate-300">
                        <span className="truncate">{t.trainerName}</span>
                        <span className="shrink-0 text-cyan-300">{t.convertedLeadsTouched} conv.</span>
                      </li>
                    ))}
                    {!analyticsQ.data.trainerStats?.length && (
                      <li className="text-slate-500">No trial activity this month.</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Pipeline</h2>
                <p className="text-sm text-slate-500">Drag-free kanban — tap a card to work the record.</p>
              </div>
              {kanbanQ.isFetching && <span className="text-xs text-slate-500">Syncing…</span>}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
              {(kanbanQ.data?.columns ?? [])
                .filter((c) => STATUS_ORDER.includes(c.status))
                .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
                .map((col) => (
                  <div
                    key={col.status}
                    className="snap-start shrink-0 w-[min(100vw-2rem,300px)] rounded-3xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl"
                  >
                    <div className="mb-3 flex items-center justify-between px-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {STATUS_LABEL[col.status]}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                        {col.leads.length}
                      </span>
                    </div>
                    <div className="flex max-h-[min(70vh,560px)] flex-col gap-2 overflow-y-auto pr-1">
                      <AnimatePresence initial={false}>
                        {col.leads.map((lead) => (
                          <motion.button
                            key={lead.id}
                            type="button"
                            layout
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                            onClick={() => setSelectedId(lead.id)}
                            className={`w-full rounded-2xl border bg-gradient-to-br p-3 text-left shadow-lg ${statusAccent(col.status)}`}
                          >
                            <p className="font-medium text-white">{lead.fullName}</p>
                            {lead.phone && <p className="mt-1 text-xs text-slate-300">{lead.phone}</p>}
                            {lead.leadSource && (
                              <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
                                {formatLeadSourceDisplay(lead)}
                              </p>
                            )}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                      {!col.leads.length && (
                        <p className="py-8 text-center text-xs text-slate-600">Empty</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

      {selectedId != null && (
        <LeadDetailModal
          open
          lead={leadDetail}
          loading={detailQ.isLoading}
          canCrm={canCrm}
          canConvert={canConvert}
          onClose={() => setSelectedId(null)}
          onEdit={canCrm ? () => setEditLeadOpen(true) : undefined}
          onOpenFollow={() => setFollowOpen(true)}
          onOpenTrial={() => setTrialOpen(true)}
          onOpenConvert={() => setConvertOpen(true)}
          onSetStatus={(status) => setStatusMu.mutate({ id: selectedId, status })}
        />
      )}

      {canCrm && (
        <>
          <NewLeadModal open={newLeadOpen} onClose={() => setNewLeadOpen(false)} onCreated={(id) => setSelectedId(id)} />
          {selectedId != null && leadDetail && leadDetail.status !== 'CONVERTED' && (
            <EditLeadModal
              open={editLeadOpen}
              lead={leadDetail}
              onClose={() => setEditLeadOpen(false)}
              onSaved={() => {
                setEditLeadOpen(false)
                invalidateKanban()
                void qc.invalidateQueries({ queryKey: ['leads', 'detail', selectedId] })
                void qc.invalidateQueries({ queryKey: ['leads', 'analytics'] })
              }}
            />
          )}
          {selectedId != null && (
            <>
              <FollowUpModal
                open={followOpen}
                leadId={selectedId}
                onClose={() => setFollowOpen(false)}
                onSaved={() => {
                  setFollowOpen(false)
                  invalidateKanban()
                  void qc.invalidateQueries({ queryKey: ['leads', 'detail', selectedId] })
                  void qc.invalidateQueries({ queryKey: ['leads', 'reception-dashboard'] })
                }}
              />
              <TrialModal
                open={trialOpen}
                leadId={selectedId}
                trainers={trainersQ.data ?? []}
                onClose={() => setTrialOpen(false)}
                onSaved={() => {
                  setTrialOpen(false)
                  invalidateKanban()
                  void qc.invalidateQueries({ queryKey: ['leads', 'detail', selectedId] })
                }}
              />
              <ConvertModal
                open={convertOpen}
                leadId={selectedId}
                plans={plansQ.data ?? []}
                onClose={() => setConvertOpen(false)}
                onSaved={() => {
                  setConvertOpen(false)
                  invalidateKanban()
                  void qc.invalidateQueries({ queryKey: ['leads', 'detail', selectedId] })
                  void qc.invalidateQueries({ queryKey: ['leads', 'reception-dashboard'] })
                  void qc.invalidateQueries({ queryKey: ['leads', 'analytics'] })
                }}
              />
            </>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

function LeadDetailModal({
  open,
  lead,
  loading,
  canCrm,
  canConvert,
  onClose,
  onEdit,
  onOpenFollow,
  onOpenTrial,
  onOpenConvert,
  onSetStatus,
}: {
  open: boolean
  lead?: GymLeadDetail
  loading: boolean
  canCrm: boolean
  canConvert: boolean
  onClose: () => void
  onEdit?: () => void
  onOpenFollow: () => void
  onOpenTrial: () => void
  onOpenConvert: () => void
  onSetStatus: (s: LeadPipelineStatus) => void
}) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={loading ? 'Lead' : lead?.fullName ?? 'Lead'} size="wide" scrollable>
      {loading || !lead ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {canCrm &&
              STATUS_ORDER.filter((s) => s !== 'CONVERTED' || lead.status === 'CONVERTED').map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={lead.status === 'CONVERTED' && s !== 'CONVERTED'}
                  onClick={() => onSetStatus(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    lead.status === s
                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-300">
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p>{lead.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p>{lead.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Gender / age</p>
              <p>
                {lead.gender || '—'}
                {lead.age != null ? ` · ${lead.age}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Lead source</p>
              <p>{formatLeadSourceDisplay(lead)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Fitness goal</p>
              <p>{lead.fitnessGoal ?? '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Notes</p>
              <p className="whitespace-pre-wrap">{lead.notes ?? '—'}</p>
            </div>
            {lead.convertedMemberId && (
              <div className="sm:col-span-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-200/90">Converted member ID · {lead.convertedMemberId}</p>
                <Link className="mt-1 inline-block text-sm text-cyan-300 hover:underline" to={`/dashboard/users/${lead.convertedMemberId}`}>
                  Open member profile →
                </Link>
              </div>
            )}
          </div>
          {canCrm && lead.status !== 'CONVERTED' && (
            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
              {onEdit && (
                <Button size="sm" variant="secondary" onClick={onEdit}>
                  Edit lead
                </Button>
              )}
              <Button size="sm" onClick={onOpenFollow}>
                Log follow-up
              </Button>
              <Button size="sm" variant="secondary" onClick={onOpenTrial}>
                Schedule trial
              </Button>
              {canConvert && (
                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={onOpenConvert}>
                  Convert to member
                </Button>
              )}
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-ups</h3>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs">
                {lead.followups.map((f) => (
                  <li key={f.id} className="rounded-lg border border-white/10 bg-black/30 p-2">
                    <p className="text-slate-200">{f.notes}</p>
                    {f.nextFollowUpAt && (
                      <p className="mt-1 text-slate-500">Next: {new Date(f.nextFollowUpAt).toLocaleString()}</p>
                    )}
                    {f.callRemarks && <p className="mt-1 text-slate-400">Call: {f.callRemarks}</p>}
                  </li>
                ))}
                {!lead.followups.length && <li className="text-slate-600">No follow-ups yet.</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trials</h3>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs">
                {lead.trials.map((t) => (
                  <TrialRow key={t.id} leadId={lead.id} trial={t} />
                ))}
                {!lead.trials.length && <li className="text-slate-600">No trials yet.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function TrialRow({
  leadId,
  trial,
}: {
  leadId: number
  trial: GymLeadDetail['trials'][number]
}) {
  const qc = useQueryClient()
  const [fb, setFb] = useState(trial.feedback ?? '')
  const [prob, setProb] = useState(() =>
    trial.conversionProbability != null ? String(trial.conversionProbability) : '',
  )
  const myTrainerId = authService.getCurrentUser()?.trainerId
  const canEdit =
    authService.hasPermission('LEADS_CRM') ||
    (authService.hasPermission('LEADS_TRAINER') && myTrainerId != null && myTrainerId === trial.assignedTrainerId)

  const mu = useMutation({
    mutationFn: () =>
      leadsService.updateTrial(leadId, trial.id, {
        feedback: fb || null,
        conversionProbability: prob === '' ? null : Number(prob),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leads', 'detail', leadId] }),
  })

  if (!canEdit) {
    return (
      <li className="rounded-lg border border-white/10 bg-black/30 p-2">
        <p className="font-medium text-slate-200">
          {new Date(trial.trialDate).toLocaleDateString()} · {trial.assignedTrainerName ?? 'Trainer'}
        </p>
        {trial.feedback && <p className="mt-1 text-slate-400">{trial.feedback}</p>}
        {trial.conversionProbability != null && (
          <p className="mt-1 text-xs text-cyan-300">{trial.conversionProbability}% likelihood</p>
        )}
      </li>
    )
  }

  return (
    <li className="rounded-lg border border-white/10 bg-black/30 p-2">
      <p className="font-medium text-slate-200">
        {new Date(trial.trialDate).toLocaleDateString()} · {trial.assignedTrainerName ?? 'Trainer'}
      </p>
      <div className="mt-2 space-y-2">
        <textarea
          value={fb}
          onChange={(e) => setFb(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white"
          rows={2}
          placeholder="Trainer feedback"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={prob}
          onChange={(e) => setProb(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white"
          placeholder="Conversion % (0–100)"
        />
        <Button size="sm" className="w-full" disabled={mu.isPending} onClick={() => mu.mutate()}>
          Save trial
        </Button>
      </div>
    </li>
  )
}

function NewLeadModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const glassInput =
    'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white shadow-inner backdrop-blur-xl focus:border-violet-500/35 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
  const [form, setForm] = useState<CreateGymLeadDto>({
    fullName: '',
    gender: 'Other',
    leadSource: '',
    customLeadSource: '',
  })
  const [sourceErr, setSourceErr] = useState<string | undefined>()
  const [customErr, setCustomErr] = useState<string | undefined>()
  const qc = useQueryClient()

  useEffect(() => {
    if (!open) return
    setForm({
      fullName: '',
      gender: 'Other',
      leadSource: '',
      customLeadSource: '',
    })
    setSourceErr(undefined)
    setCustomErr(undefined)
  }, [open])

  const mu = useMutation({
    mutationFn: () => {
      const code = (form.leadSource ?? '').trim().toUpperCase()
      const body: CreateGymLeadDto = {
        fullName: form.fullName.trim(),
        gender: form.gender,
        phone: form.phone || null,
        email: form.email || null,
        age: form.age ?? null,
        occupation: form.occupation || null,
        fitnessGoal: form.fitnessGoal || null,
        leadSource: code,
        customLeadSource: code === 'OTHER' ? (form.customLeadSource ?? '').trim() || null : null,
        referenceName: form.referenceName || null,
        notes: form.notes || null,
      }
      return leadsService.create(body)
    },
    onSuccess: async (res) => {
      const id = res.data.id
      onClose()
      await qc.invalidateQueries({ queryKey: ['leads'] })
      onCreated(id)
    },
  })

  const trySave = () => {
    setSourceErr(undefined)
    setCustomErr(undefined)
    if (!form.fullName?.trim()) return
    if (!(form.leadSource ?? '').trim()) {
      setSourceErr('Please select a lead source.')
      return
    }
    if (form.leadSource === 'OTHER' && !(form.customLeadSource ?? '').trim()) {
      setCustomErr('Please specify the source.')
      return
    }
    mu.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="New lead" size="wide" scrollable>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ['fullName', 'Full name', 'text', true],
            ['phone', 'Mobile', 'text', false],
            ['email', 'Email', 'email', false],
            ['gender', 'Gender', 'text', false],
            ['age', 'Age', 'number', false],
            ['occupation', 'Occupation', 'text', false],
            ['fitnessGoal', 'Fitness goal', 'text', false],
          ] as const
        ).map(([key, label, type, required]) => (
          <label key={key} className="block text-xs font-medium uppercase tracking-wider text-slate-400 sm:col-span-1">
            {label}
            {required && <span className="text-rose-400/90"> *</span>}
            <input
              required={required}
              type={type}
              className={glassInput}
              value={String((form as Record<string, unknown>)[key] ?? '')}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  [key]: type === 'number' ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value,
                }))
              }
            />
          </label>
        ))}
        <div className="sm:col-span-2 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-cyan-500/[0.04] p-4 sm:p-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">
            How did you hear about us?
          </p>
          <p className="mb-3 text-xs text-slate-500">Select the primary channel. Search the list to move faster.</p>
          <LeadSourceCombobox
            value={form.leadSource ?? ''}
            onChange={(code) =>
              setForm((f) => ({
                ...f,
                leadSource: code,
                customLeadSource: code === 'OTHER' ? f.customLeadSource : '',
              }))
            }
            customValue={form.customLeadSource ?? ''}
            onCustomChange={(v) => setForm((f) => ({ ...f, customLeadSource: v }))}
            error={sourceErr}
            customError={customErr}
          />
        </div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 sm:col-span-1">
          Reference name
          <input
            type="text"
            className={glassInput}
            value={form.referenceName ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, referenceName: e.target.value }))}
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 sm:col-span-2">
          Notes
          <textarea
            className={`${glassInput} min-h-[88px]`}
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={mu.isPending} onClick={trySave}>
          Save lead
        </Button>
      </div>
    </Modal>
  )
}

function EditLeadModal({
  open,
  lead,
  onClose,
  onSaved,
}: {
  open: boolean
  lead: GymLeadDetail
  onClose: () => void
  onSaved: () => void
}) {
  const glassInput =
    'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white shadow-inner backdrop-blur-xl focus:border-violet-500/35 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
  const [form, setForm] = useState<CreateGymLeadDto>({
    fullName: lead.fullName,
    gender: lead.gender || 'Other',
    leadSource: '',
    customLeadSource: '',
  })
  const [sourceErr, setSourceErr] = useState<string | undefined>()
  const [customErr, setCustomErr] = useState<string | undefined>()
  const qc = useQueryClient()

  useEffect(() => {
    if (!open) return
    const { code, custom } = resolveLeadSourceForForm(lead.leadSource, lead.customLeadSource)
    setForm({
      fullName: lead.fullName,
      gender: lead.gender || 'Other',
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      age: lead.age ?? undefined,
      occupation: lead.occupation ?? '',
      fitnessGoal: lead.fitnessGoal ?? '',
      leadSource: code,
      customLeadSource: custom,
      referenceName: lead.referenceName ?? '',
      notes: lead.notes ?? '',
    })
    setSourceErr(undefined)
    setCustomErr(undefined)
  }, [open, lead])

  const mu = useMutation({
    mutationFn: () => {
      const code = (form.leadSource ?? '').trim().toUpperCase()
      return leadsService.update(lead.id, {
        fullName: form.fullName.trim(),
        gender: form.gender,
        phone: form.phone || null,
        email: form.email || null,
        age: form.age ?? null,
        occupation: form.occupation || null,
        fitnessGoal: form.fitnessGoal || null,
        leadSource: code,
        customLeadSource: code === 'OTHER' ? (form.customLeadSource ?? '').trim() || null : null,
        referenceName: form.referenceName || null,
        notes: form.notes || null,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['leads'] })
      onSaved()
    },
  })

  const trySave = () => {
    setSourceErr(undefined)
    setCustomErr(undefined)
    if (!form.fullName?.trim()) return
    if (!(form.leadSource ?? '').trim()) {
      setSourceErr('Please select a lead source.')
      return
    }
    if (form.leadSource === 'OTHER' && !(form.customLeadSource ?? '').trim()) {
      setCustomErr('Please specify the source.')
      return
    }
    mu.mutate()
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="Edit lead" size="wide" scrollable>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ['fullName', 'Full name', 'text', true],
            ['phone', 'Mobile', 'text', false],
            ['email', 'Email', 'email', false],
            ['gender', 'Gender', 'text', false],
            ['age', 'Age', 'number', false],
            ['occupation', 'Occupation', 'text', false],
            ['fitnessGoal', 'Fitness goal', 'text', false],
          ] as const
        ).map(([key, label, type, required]) => (
          <label key={key} className="block text-xs font-medium uppercase tracking-wider text-slate-400 sm:col-span-1">
            {label}
            {required && <span className="text-rose-400/90"> *</span>}
            <input
              required={required}
              type={type}
              className={glassInput}
              value={String((form as Record<string, unknown>)[key] ?? '')}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  [key]: type === 'number' ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value,
                }))
              }
            />
          </label>
        ))}
        <div className="sm:col-span-2 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-cyan-500/[0.04] p-4 sm:p-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">
            How did you hear about us?
          </p>
          <LeadSourceCombobox
            value={form.leadSource ?? ''}
            onChange={(code) =>
              setForm((f) => ({
                ...f,
                leadSource: code,
                customLeadSource: code === 'OTHER' ? f.customLeadSource : '',
              }))
            }
            customValue={form.customLeadSource ?? ''}
            onCustomChange={(v) => setForm((f) => ({ ...f, customLeadSource: v }))}
            error={sourceErr}
            customError={customErr}
          />
        </div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 sm:col-span-1">
          Reference name
          <input
            type="text"
            className={glassInput}
            value={form.referenceName ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, referenceName: e.target.value }))}
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 sm:col-span-2">
          Notes
          <textarea className={`${glassInput} min-h-[88px]`} rows={3} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={mu.isPending} onClick={trySave}>
          Save changes
        </Button>
      </div>
    </Modal>
  )
}

function FollowUpModal({
  open,
  leadId,
  onClose,
  onSaved,
}: {
  open: boolean
  leadId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [notes, setNotes] = useState('')
  const [next, setNext] = useState('')
  const [remarks, setRemarks] = useState('')
  const mu = useMutation({
    mutationFn: () =>
      leadsService.addFollowup(leadId, {
        notes,
        nextFollowUpAt: next ? new Date(next).toISOString() : null,
        callRemarks: remarks || null,
      }),
    onSuccess: () => {
      setNotes('')
      setNext('')
      setRemarks('')
      onSaved()
    },
  })
  return (
    <Modal open={open} onClose={onClose} title="Log follow-up">
      <label className="block text-xs text-slate-400">
        Notes
        <textarea
          required
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-xs text-slate-400">
        Next follow-up
        <input
          type="datetime-local"
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-xs text-slate-400">
        Call remarks
        <input
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={mu.isPending || !notes.trim()} onClick={() => mu.mutate()}>
          Save
        </Button>
      </div>
    </Modal>
  )
}

function TrialModal({
  open,
  leadId,
  trainers,
  onClose,
  onSaved,
}: {
  open: boolean
  leadId: number
  trainers: { id: number; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [trainerIdPick, setTrainerIdPick] = useState<number | null>(null)
  const [trialDate, setTrialDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [feedback, setFeedback] = useState('')
  const [prob, setProb] = useState('')
  const resolvedTrainerId = useMemo(() => {
    if (!trainers.length) return 0
    if (trainerIdPick != null && trainers.some((t) => t.id === trainerIdPick)) return trainerIdPick
    return trainers[0].id
  }, [trainers, trainerIdPick])
  const mu = useMutation({
    mutationFn: () =>
      leadsService.addTrial(leadId, {
        trialDate: new Date(trialDate).toISOString(),
        assignedTrainerId: resolvedTrainerId,
        feedback: feedback || null,
        conversionProbability: prob === '' ? null : Number(prob),
      }),
    onSuccess: () => onSaved(),
  })
  return (
    <Modal open={open} onClose={onClose} title="Schedule trial" scrollable>
      <label className="block text-xs text-slate-400">
        Trainer
        <select
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={resolvedTrainerId}
          onChange={(e) => setTrainerIdPick(Number(e.target.value))}
        >
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs text-slate-400">
        Trial date
        <input
          type="date"
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={trialDate}
          onChange={(e) => setTrialDate(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-xs text-slate-400">
        Feedback (optional)
        <textarea
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          rows={2}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-xs text-slate-400">
        Conversion % (optional)
        <input
          type="number"
          min={0}
          max={100}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={prob}
          onChange={(e) => setProb(e.target.value)}
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={mu.isPending || !resolvedTrainerId} onClick={() => mu.mutate()}>
          Save
        </Button>
      </div>
    </Modal>
  )
}

function ConvertModal({
  open,
  leadId,
  plans,
  onClose,
  onSaved,
}: {
  open: boolean
  leadId: number
  plans: { id: number; planName: string; durationDays: number; price: number }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [planIdPick, setPlanIdPick] = useState<number | null>(null)
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [password, setPassword] = useState('')
  const resolvedPlanId = useMemo(() => {
    if (!plans.length) return 0
    if (planIdPick != null && plans.some((p) => p.id === planIdPick)) return planIdPick
    return plans[0].id
  }, [plans, planIdPick])
  const mu = useMutation({
    mutationFn: () =>
      leadsService.convert(leadId, {
        planId: resolvedPlanId,
        membershipStartDate: new Date(start).toISOString(),
        password: password || null,
      }),
    onSuccess: () => onSaved(),
  })
  return (
    <Modal open={open} onClose={onClose} title="Convert to member" scrollable>
      <p className="text-xs text-slate-400">
        Creates the member through the same API as <strong>New admission</strong>, assigns the plan, and links this lead.
        Requires <strong>CREATE_MEMBER</strong>.
      </p>
      <label className="mt-3 block text-xs text-slate-400">
        Plan
        <select
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={resolvedPlanId}
          onChange={(e) => setPlanIdPick(Number(e.target.value))}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.planName} · {p.durationDays}d · {formatInr(p.price)}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs text-slate-400">
        Membership start
        <input
          type="date"
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-xs text-slate-400">
        App password (optional — enables login when lead has email)
        <input
          type="password"
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={mu.isPending || !resolvedPlanId} onClick={() => mu.mutate()}>
          Convert
        </Button>
      </div>
    </Modal>
  )
}
