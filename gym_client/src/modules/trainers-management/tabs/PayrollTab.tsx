import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { SectionCard } from '../components/SectionCard'
import { useTrainersModuleStore } from '../store'
import { salaryBaseForTrainer } from '../utils'

export function TrainersPayrollTab() {
  const trainers = useTrainersModuleStore((s) => s.trainers)
  const sessions = useTrainersModuleStore((s) => s.sessions)
  const adjustments = useTrainersModuleStore((s) => s.adjustments)
  const payrollHistory = useTrainersModuleStore((s) => s.payrollHistory)
  const addAdjustment = useTrainersModuleStore((s) => s.addAdjustment)
  const savePayroll = useTrainersModuleStore((s) => s.savePayroll)

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [trainerId, setTrainerId] = useState(trainers[0]?.id ?? '')
  const [label, setLabel] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'bonus' | 'deduction'>('bonus')
  const [amount, setAmount] = useState(0)

  const selectedTrainer = trainers.find((trainer) => trainer.id === trainerId)
  const sessionsInMonth = sessions
    .filter((entry) => entry.trainerId === trainerId && entry.date.startsWith(month))
    .reduce((sum, entry) => sum + entry.count, 0)

  const adjustmentTotal = adjustments
    .filter((entry) => entry.trainerId === trainerId && entry.month === month)
    .reduce((sum, entry) => sum + (entry.type === 'bonus' ? entry.amount : -entry.amount), 0)

  const base = selectedTrainer ? salaryBaseForTrainer(selectedTrainer, sessionsInMonth) : 0
  const netSalary = Math.max(0, base + adjustmentTotal)

  const trainerHistory = useMemo(
    () => payrollHistory.filter((entry) => entry.trainerId === trainerId),
    [payrollHistory, trainerId],
  )

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard title="Payroll Calculator" subtitle="Fixed or per-session salary model with adjustments.">
        <div className="grid gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Trainer</label>
            <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
              ))}
            </select>
          </div>
          <Input type="month" label="Month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          <div className="mb-2 flex justify-between"><span className="text-slate-400">Salary model</span><span className="text-white">{selectedTrainer?.salaryType === 'fixed' ? 'Fixed' : 'Per session'}</span></div>
          <div className="mb-2 flex justify-between"><span className="text-slate-400">Sessions this month</span><span className="text-white">{sessionsInMonth}</span></div>
          <div className="mb-2 flex justify-between"><span className="text-slate-400">Base salary</span><span className="text-white">₹{base.toLocaleString()}</span></div>
          <div className="mb-2 flex justify-between"><span className="text-slate-400">Adjustments</span><span className={adjustmentTotal >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{adjustmentTotal >= 0 ? '+' : '-'}₹{Math.abs(adjustmentTotal).toLocaleString()}</span></div>
          <div className="mt-3 border-t border-white/10 pt-3 flex justify-between font-semibold"><span className="text-slate-300">Net salary</span><span className="text-white">₹{netSalary.toLocaleString()}</span></div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => { savePayroll(month, trainerId, 'paid'); toast.success('Payroll marked as paid.') }}>Mark Paid</Button>
            <Button variant="soft" size="sm" onClick={() => { savePayroll(month, trainerId, 'pending'); toast.success('Payroll saved as pending.') }}>Mark Pending</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Adjustments & History" subtitle="Bonuses, deductions, and salary history.">
        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <Input label="Adjustment label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Type</label>
            <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as 'bonus' | 'deduction')} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <option value="bonus">Bonus</option>
              <option value="deduction">Deduction</option>
            </select>
          </div>
          <Input type="number" label="Amount" value={String(amount)} onChange={(e) => setAmount(Number(e.target.value))} />
          <Button
            variant="soft"
            onClick={() => {
              if (!label.trim() || amount <= 0) {
                toast.error('Enter valid adjustment details.')
                return
              }
              addAdjustment({ trainerId, month, label, type: adjustmentType, amount })
              toast.success('Adjustment added.')
              setLabel('')
              setAmount(0)
            }}
          >
            Add adjustment
          </Button>
        </div>
        <div className="mt-4 max-h-[260px] overflow-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-slate-400">
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Net</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {trainerHistory.map((entry) => (
                <tr key={entry.id} className="border-b border-white/5">
                  <td className="px-3 py-2 text-slate-300">{entry.month}</td>
                  <td className="px-3 py-2 text-white">₹{entry.finalAmount.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${entry.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {entry.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
