import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { SectionCard } from '../components/SectionCard'
import { useTrainersModuleStore } from '../store'
import type { ReportFilters } from '../types'
import { downloadCsv, inDateRange, sessionsByTrainer } from '../utils'

type ReportDetail = { title: string; rows: Array<{ label: string; value: string | number }> } | null

export function TrainersReportsTab() {
  const trainers = useTrainersModuleStore((s) => s.trainers)
  const sessions = useTrainersModuleStore((s) => s.sessions)
  const attendance = useTrainersModuleStore((s) => s.attendance)
  const payrollHistory = useTrainersModuleStore((s) => s.payrollHistory)

  const [detail, setDetail] = useState<ReportDetail>(null)
  const [filters, setFilters] = useState<ReportFilters>({
    trainerId: 'all',
    startDate: new Date(new Date().setDate(1)).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  })

  const sessionsMap = useMemo(() => sessionsByTrainer(sessions, filters), [sessions, filters])
  const attendanceSummary = useMemo(
    () =>
      attendance.filter((row) => {
        const trainerMatch = filters.trainerId === 'all' || row.trainerId === filters.trainerId
        return trainerMatch && inDateRange(row.date, filters.startDate, filters.endDate)
      }),
    [attendance, filters],
  )
  const monthPrefix = filters.startDate.slice(0, 7)
  const salarySummary = useMemo(
    () =>
      payrollHistory.filter(
        (entry) =>
          entry.month === monthPrefix &&
          (filters.trainerId === 'all' || entry.trainerId === filters.trainerId),
      ),
    [filters.trainerId, monthPrefix, payrollHistory],
  )

  const totalSalary = salarySummary.reduce((sum, row) => sum + row.finalAmount, 0)
  const presentCount = attendanceSummary.filter((row) => row.status === 'present').length
  const absentCount = attendanceSummary.filter((row) => row.status === 'absent').length

  function exportCsv() {
    const rows: Array<Array<string | number>> = [
      ['Trainer', 'Sessions', 'Present Days', 'Absent Days', 'Salary (month)'],
    ]
    trainers.forEach((trainer) => {
      if (filters.trainerId !== 'all' && trainer.id !== filters.trainerId) return
      rows.push([
        trainer.name,
        sessionsMap[trainer.id] ?? 0,
        attendanceSummary.filter((item) => item.trainerId === trainer.id && item.status === 'present').length,
        attendanceSummary.filter((item) => item.trainerId === trainer.id && item.status === 'absent').length,
        salarySummary
          .filter((item) => item.trainerId === trainer.id)
          .reduce((sum, item) => sum + item.finalAmount, 0),
      ])
    })
    downloadCsv(`trainer-report-${filters.startDate}-to-${filters.endDate}.csv`, rows)
    toast.success('CSV exported.')
  }

  function exportPdf() {
    window.print()
    toast.success('Use print dialog to save as PDF.')
  }

  return (
    <>
      <SectionCard title="Reports" subtitle="Monthly salary, performance, attendance summary with drill-down.">
        <div className="grid gap-2 sm:grid-cols-4">
          <Input type="date" label="Start date" value={filters.startDate} onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))} />
          <Input type="date" label="End date" value={filters.endDate} onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))} />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Trainer</label>
            <select className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" value={filters.trainerId} onChange={(e) => setFilters((prev) => ({ ...prev, trainerId: e.target.value }))}>
              <option value="all">All trainers</option>
              {trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10" onClick={() => setDetail({ title: 'Monthly Salary Report', rows: salarySummary.map((row) => ({ label: trainers.find((trainer) => trainer.id === row.trainerId)?.name ?? row.trainerId, value: `₹${row.finalAmount.toLocaleString()} (${row.status})` })) })}>
            <p className="text-xs text-slate-400">Monthly Salary Report</p>
            <p className="mt-1 text-xl font-bold text-white">₹{totalSalary.toLocaleString()}</p>
          </button>
          <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10" onClick={() => setDetail({ title: 'Trainer Performance', rows: trainers.filter((trainer) => filters.trainerId === 'all' || trainer.id === filters.trainerId).map((trainer) => ({ label: trainer.name, value: `${sessionsMap[trainer.id] ?? 0} sessions` })) })}>
            <p className="text-xs text-slate-400">Trainer Performance</p>
            <p className="mt-1 text-xl font-bold text-white">{Object.values(sessionsMap).reduce((sum, count) => sum + count, 0)} sessions</p>
          </button>
          <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10" onClick={() => setDetail({ title: 'Attendance Summary', rows: [{ label: 'Present days', value: presentCount }, { label: 'Absent days', value: absentCount }] })}>
            <p className="text-xs text-slate-400">Attendance Summary</p>
            <p className="mt-1 text-xl font-bold text-white">{presentCount} / {presentCount + absentCount}</p>
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="soft" onClick={exportCsv}>Export CSV</Button>
          <Button variant="soft" onClick={exportPdf}>Export PDF</Button>
        </div>
      </SectionCard>

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? 'Details'}>
        <div className="space-y-2">
          {detail?.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <span className="text-slate-300">{row.label}</span>
              <span className="font-semibold text-white">{row.value}</span>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
