import { useMemo, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { ModulePageShell } from '../components/ModulePageShell'
import { EmptyState } from '../components/EmptyState'
import { useExpenses } from '../hooks/useGymOperations'
import { useStaggerAnimation } from '../hooks/useStaggerAnimation'
import { formatDate, formatINR, isThisMonth } from '../utils/format'
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
} from '../types'

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Utilities: 'from-cyan-400 to-blue-500',
  Maintenance: 'from-amber-400 to-orange-500',
  Supplies: 'from-emerald-400 to-teal-500',
  Marketing: 'from-fuchsia-500 to-pink-500',
  Salaries: 'from-blue-500 to-purple-500',
  Other: 'from-slate-400 to-slate-500',
}

export function ExpensesPage() {
  const { data = [], isLoading } = useExpenses()
  const tableRef = useRef<HTMLTableSectionElement>(null)

  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Utilities')
  const [formVendor, setFormVendor] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState<ExpenseStatus>('PAID')

  const metrics = useMemo(() => {
    const monthTotal = data
      .filter((e) => isThisMonth(e.incurredAt))
      .reduce((a, b) => a + b.amount, 0)
    const monthPending = data
      .filter((e) => isThisMonth(e.incurredAt) && e.status === 'PENDING')
      .reduce((a, b) => a + b.amount, 0)

    const byCategory = new Map<ExpenseCategory, number>()
    data.forEach((e) => {
      if (isThisMonth(e.incurredAt)) {
        byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount)
      }
    })
    const top =
      Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])[0] ?? null

    return { monthTotal, monthPending, topCategory: top }
  }, [data])

  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => new Date(b.incurredAt).getTime() - new Date(a.incurredAt).getTime(),
      ),
    [data],
  )

  useStaggerAnimation(tableRef, 'tr[data-row]', [sorted.length, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormVendor('')
    setFormAmount('')
    setFormDescription('')
  }

  return (
    <ModulePageShell
      eyebrow="Gym Operations"
      titleGradient="Expenses"
      subtitle="Track operating costs, categorize spend, and keep tabs on pending payments."
    >
      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            label="This month total"
            value={formatINR(metrics.monthTotal)}
            caption="All expenses logged this month"
            gradient="from-blue-500 to-purple-500"
          />
          <SummaryCard
            label="Pending payments"
            value={formatINR(metrics.monthPending)}
            caption={
              metrics.monthPending > 0
                ? 'Outstanding vendor invoices'
                : 'All invoices settled'
            }
            gradient="from-amber-400 to-orange-500"
          />
          <SummaryCard
            label="Top category"
            value={metrics.topCategory ? metrics.topCategory[0] : '—'}
            caption={
              metrics.topCategory
                ? `${formatINR(metrics.topCategory[1])} this month`
                : 'No data yet'
            }
            gradient="from-emerald-400 to-teal-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="glass-card dashboard-card lg:col-span-1 min-w-0 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-white">Add expense</h2>
            <p className="mb-4 text-xs text-slate-400">Quick entry form (mock only).</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                >
                  {Object.keys(CATEGORY_COLORS).map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <TextInput label="Vendor (optional)" value={formVendor} onChange={setFormVendor} />
              <TextInput
                label="Amount (₹)"
                value={formAmount}
                onChange={setFormAmount}
                required
                type="number"
              />
              <TextInput
                label="Incurred on"
                value={formDate}
                onChange={setFormDate}
                required
                type="date"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Status</label>
                <div className="flex gap-2">
                  {(['PAID', 'PENDING'] as ExpenseStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormStatus(s)}
                      className={[
                        'flex-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                        formStatus === s
                          ? s === 'PAID'
                            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-400/40 bg-amber-500/10 text-amber-300'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                      ].join(' ')}
                    >
                      {s === 'PAID' ? 'Paid' : 'Pending'}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" fullWidth size="sm">
                Save expense
              </Button>
            </form>
          </section>

          <section className="glass-card dashboard-card lg:col-span-2 min-w-0 rounded-2xl">
            <div className="border-b border-white/5 px-6 py-5">
              <h2 className="text-base font-semibold text-white">Recent expenses</h2>
              <p className="text-xs text-slate-400">Sorted newest first.</p>
            </div>
            {sorted.length === 0 && !isLoading ? (
              <EmptyState title="No expenses yet" description="Add your first expense to see it appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-3 font-semibold">Description</th>
                      <th className="px-6 py-3 font-semibold">Category</th>
                      <th className="px-6 py-3 font-semibold">Amount</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody ref={tableRef} className="divide-y divide-white/5">
                    {sorted.map((ex) => (
                      <ExpenseRow key={ex.id} expense={ex} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </ModulePageShell>
  )
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const gradient = CATEGORY_COLORS[expense.category]
  return (
    <tr data-row className="transition hover:bg-white/[0.03]">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">{expense.description}</span>
          <span className="text-[11px] text-slate-500">
            {expense.vendor ? `${expense.vendor} · ` : ''}
            {formatDate(expense.incurredAt)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center gap-2">
          <span
            className={`size-2 rounded-full bg-gradient-to-r ${gradient}`}
          />
          <span className="text-xs text-slate-300">{expense.category}</span>
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-white">
        {formatINR(expense.amount)}
      </td>
      <td className="px-6 py-4">
        <span
          className={[
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            expense.status === 'PAID'
              ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-400/25 bg-amber-500/10 text-amber-300',
          ].join(' ')}
        >
          {expense.status === 'PAID' ? 'Paid' : 'Pending'}
        </span>
      </td>
    </tr>
  )
}

function SummaryCard({
  label,
  value,
  caption,
  gradient,
}: {
  label: string
  value: string
  caption?: string
  gradient: string
}) {
  return (
    <div className="glass-card dashboard-card group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-30`}
      />
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />
    </div>
  )
}
