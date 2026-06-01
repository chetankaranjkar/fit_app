import { Activity, CircleDollarSign, UserCheck, Users } from 'lucide-react'
import { MetricCard } from '../../../components/dashboard/MetricCard'
import { DashboardMetricsGrid } from '../../../components/layout/DashboardMetricsGrid'

export function TrainersDashboardTab({
  totalTrainers,
  activeTrainers,
  monthlySalaryExpense,
  sessionsConducted,
}: {
  totalTrainers: number
  activeTrainers: number
  monthlySalaryExpense: number
  sessionsConducted: number
}) {
  return (
    <DashboardMetricsGrid cols={4}>
      <MetricCard
        title="Total Trainers"
        value={totalTrainers}
        gradient="from-blue-500 to-indigo-500"
        icon={<Users className="size-5" />}
      />
      <MetricCard
        title="Active Trainers"
        value={activeTrainers}
        gradient="from-emerald-500 to-teal-500"
        icon={<UserCheck className="size-5" />}
      />
      <MetricCard
        title="Monthly Salary Expense"
        value={`₹${monthlySalaryExpense.toLocaleString()}`}
        gradient="from-amber-500 to-orange-500"
        icon={<CircleDollarSign className="size-5" />}
      />
      <MetricCard
        title="Sessions Conducted"
        value={sessionsConducted}
        gradient="from-violet-500 to-fuchsia-500"
        icon={<Activity className="size-5" />}
      />
    </DashboardMetricsGrid>
  )
}
