import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { ModulePageShell } from '../components/ModulePageShell'
import { EmptyState } from '../components/EmptyState'
import {
  useCreateMaintenance,
  useEquipment,
  useMaintenance,
} from '../hooks/useGymOperations'
import { useStaggerAnimation } from '../hooks/useStaggerAnimation'
import { formatDateTime, formatINR } from '../utils/format'
import type { MaintenanceLog, MaintenanceType } from '../types'

const TYPE_STYLES: Record<MaintenanceType, { label: string; cls: string }> = {
  ROUTINE: { label: 'Routine', cls: 'bg-blue-500/10 text-blue-300 border-blue-400/20' },
  REPAIR: { label: 'Repair', cls: 'bg-rose-500/10 text-rose-300 border-rose-400/30' },
  INSPECTION: { label: 'Inspection', cls: 'bg-amber-500/10 text-amber-300 border-amber-400/25' },
}

export function MaintenancePage() {
  const { data = [], isLoading } = useMaintenance()
  const [addOpen, setAddOpen] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
      ),
    [data],
  )

  useStaggerAnimation(listRef, 'li[data-row]', [sorted.length, isLoading])

  const highMaintenance = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    data.forEach((log) => {
      const prev = counts.get(log.equipmentId)
      counts.set(log.equipmentId, {
        name: log.equipmentName,
        count: (prev?.count ?? 0) + 1,
      })
    })
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [data])

  return (
    <ModulePageShell
      eyebrow="Gym Operations"
      titleBefore=""
      titleGradient="Maintenance Logs"
      subtitle="Full history of repairs, inspections and scheduled service for all gym equipment."
      primaryAction={{ label: '+ Log maintenance', onClick: () => setAddOpen(true) }}
    >
      {/* Scoped scrollbar styling for the timeline's internal scroll container.
          Kept local to this page so global styles are not affected. */}
      <style>{`
        .timeline-scroll { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.35) transparent; }
        .timeline-scroll::-webkit-scrollbar { width: 8px; }
        .timeline-scroll::-webkit-scrollbar-track { background: transparent; }
        .timeline-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.25); border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box; }
        .timeline-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.45); border: 2px solid transparent; background-clip: padding-box; }
      `}</style>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <section className="glass-card dashboard-card lg:col-span-2 min-w-0 flex flex-col rounded-2xl max-h-[calc(100vh-14rem)]">
          <div className="shrink-0 border-b border-white/5 px-6 py-5">
            <h2 className="text-base font-semibold text-white">Activity timeline</h2>
            <p className="text-xs text-slate-400">
              {sorted.length} entries · latest first
            </p>
          </div>

          {sorted.length === 0 && !isLoading ? (
            <EmptyState
              title="No maintenance entries yet"
              description="When service or repairs are performed, they'll appear here."
              action={
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  + Log maintenance
                </Button>
              }
            />
          ) : (
            <div
              data-lenis-prevent
              className="timeline-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <ol ref={listRef} className="relative space-y-4 px-6 py-5">
                <span
                  aria-hidden
                  className="absolute bottom-6 left-[23px] top-6 w-px bg-gradient-to-b from-blue-400/40 via-purple-400/30 to-transparent"
                />
                {sorted.map((log) => (
                  <TimelineEntry key={log.id} log={log} />
                ))}
              </ol>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="glass-card dashboard-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              High-maintenance equipment
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Top 3 by repair / service frequency.
            </p>
            <ul className="mt-4 space-y-2">
              {highMaintenance.length === 0 && (
                <li className="text-xs text-slate-500">No entries yet.</li>
              )}
              {highMaintenance.map((h, idx) => (
                <li
                  key={h.name}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm text-white">
                    <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-500 text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    {h.name}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {h.count} {h.count === 1 ? 'log' : 'logs'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <AddMaintenanceModal open={addOpen} onClose={() => setAddOpen(false)} />
    </ModulePageShell>
  )
}

function TimelineEntry({ log }: { log: MaintenanceLog }) {
  const style = TYPE_STYLES[log.type]
  return (
    <li data-row className="relative pl-12">
      <span
        aria-hidden
        className="absolute left-3 top-2 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 ring-4 ring-[#0b0b1a]"
      >
        <span className="size-2 rounded-full bg-white" />
      </span>
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/10 hover:bg-white/[0.05]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{log.equipmentName}</p>
            <p className="text-[11px] text-slate-500">
              {formatDateTime(log.performedAt)} · {log.performedBy}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.cls}`}
          >
            {style.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">{log.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          {log.cost != null && (
            <span>
              Cost: <span className="text-slate-200">{formatINR(log.cost)}</span>
            </span>
          )}
          {log.nextServiceDate && (
            <span>
              Next service:{' '}
              <span className="text-slate-200">
                {new Date(log.nextServiceDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

function AddMaintenanceModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: equipment = [] } = useEquipment()
  const createMut = useCreateMaintenance()
  const todayIso = () => new Date().toISOString().slice(0, 10)
  const [equipmentId, setEquipmentId] = useState<string>('')
  const [type, setType] = useState<MaintenanceType>('ROUTINE')
  const [performedAt, setPerformedAt] = useState<string>(todayIso)
  const [performedBy, setPerformedBy] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')
  const [nextServiceDate, setNextServiceDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setEquipmentId('')
    setType('ROUTINE')
    setPerformedAt(todayIso())
    setPerformedBy('')
    setCost('')
    setDescription('')
    setNextServiceDate('')
    setError(null)
  }

  // Reset form state every time the modal opens so stale input from a
  // previous session doesn't bleed into a new entry.
  useEffect(() => {
    if (open) reset()
  }, [open])

  const selected = equipment.find((e) => e.id === equipmentId)
  const valid =
    !!selected &&
    performedBy.trim() !== '' &&
    description.trim() !== '' &&
    performedAt !== ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!valid || !selected) return
    const parsedCost = cost.trim() === '' ? undefined : Number(cost)
    if (parsedCost !== undefined && !Number.isFinite(parsedCost)) {
      setError('Cost must be a number.')
      return
    }
    createMut.mutate(
      {
        input: {
          equipmentId: selected.id,
          type,
          performedAt: new Date(performedAt).toISOString(),
          performedBy: performedBy.trim(),
          cost: parsedCost,
          description: description.trim(),
          nextServiceDate: nextServiceDate
            ? new Date(nextServiceDate).toISOString()
            : undefined,
        },
        equipmentName: selected.name,
      },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
        onError: () => {
          setError('Could not save. Please try again.')
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Log maintenance">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">Equipment</label>
          <select
            required
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          >
            <option className="bg-slate-900" value="">
              Select equipment…
            </option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id} className="bg-slate-900">
                {eq.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MaintenanceType)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            >
              <option className="bg-slate-900" value="ROUTINE">Routine</option>
              <option className="bg-slate-900" value="REPAIR">Repair</option>
              <option className="bg-slate-900" value="INSPECTION">Inspection</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Performed on</label>
            <input
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
        </div>
        <TextInput label="Performed by" value={performedBy} onChange={setPerformedBy} required />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextInput label="Cost (₹)" value={cost} onChange={setCost} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Next service <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="date"
              value={nextServiceDate}
              onChange={(e) => setNextServiceDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-[11px] text-rose-200">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!valid || createMut.isPending}
          >
            {createMut.isPending ? 'Saving…' : 'Save log'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function TextInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />
    </div>
  )
}
