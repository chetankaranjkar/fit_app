import { useMemo } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { TrainersTabNav } from './components/TabNav'
import { useTrainersModuleStore } from './store'
import { TrainersAttendanceSessionsTab } from './tabs/AttendanceSessionsTab'
import { TrainersDashboardTab } from './tabs/DashboardTab'
import { TrainersDocumentsTab } from './tabs/DocumentsTab'
import { TrainersManagementTab } from './tabs/ManagementTab'
import { TrainersPayrollTab } from './tabs/PayrollTab'
import { TrainersReportsTab } from './tabs/ReportsTab'
import type { TrainerModuleTab } from './types'
import { salaryBaseForTrainer } from './utils'

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

const validTabs: TrainerModuleTab[] = [
  'dashboard',
  'management',
  'attendance-sessions',
  'payroll',
  'reports',
  'documents',
]

export function TrainersManagementPage() {
  const { userName } = getDashboardUser()
  const trainers = useTrainersModuleStore((s) => s.trainers)
  const sessions = useTrainersModuleStore((s) => s.sessions)
  const uiTheme = useTrainersModuleStore((s) => s.uiTheme)
  const setTheme = useTrainersModuleStore((s) => s.setTheme)
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const activeTab: TrainerModuleTab = validTabs.includes(tabParam as TrainerModuleTab)
    ? (tabParam as TrainerModuleTab)
    : 'dashboard'

  const metrics = useMemo(() => {
    const totalTrainers = trainers.length
    const activeTrainers = trainers.filter((trainer) => trainer.status === 'active').length
    const sessionsConducted = sessions.reduce((sum, entry) => sum + entry.count, 0)
    const month = new Date().toISOString().slice(0, 7)
    const monthlySalaryExpense = trainers.reduce((sum, trainer) => {
      const trainerSessions = sessions
        .filter((entry) => entry.trainerId === trainer.id && entry.date.startsWith(month))
        .reduce((localSum, entry) => localSum + entry.count, 0)
      return sum + salaryBaseForTrainer(trainer, trainerSessions)
    }, 0)
    return { totalTrainers, activeTrainers, sessionsConducted, monthlySalaryExpense }
  }, [sessions, trainers])

  function setTab(tab: TrainerModuleTab) {
    const next = new URLSearchParams(params)
    next.set('tab', tab)
    setParams(next, { replace: true })
  }

  return (
    <DashboardLayout userName={userName}>
      <div className={uiTheme === 'light' ? 'rounded-2xl bg-slate-100 p-3 text-slate-900' : ''}>
        <DashboardSubpageShell
          eyebrow="Staff Operations"
          titleBefore="Trainer "
          titleGradient="management"
          subtitle="Modular dashboard for management, attendance, payroll, reports, and documents."
          showExport={false}
          primaryAction={{
            label: uiTheme === 'dark' ? 'Light Theme' : 'Dark Theme',
            onClick: () => setTheme(uiTheme === 'dark' ? 'light' : 'dark'),
          }}
        >
          <div className="mb-4 flex items-center justify-end">
            <Button
              variant="soft"
              size="sm"
              onClick={() => setTheme(uiTheme === 'dark' ? 'light' : 'dark')}
            >
              {uiTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {uiTheme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </Button>
          </div>
          <TrainersTabNav activeTab={activeTab} onChange={setTab} />
          <div className="mt-4">
            {activeTab === 'dashboard' ? (
              <TrainersDashboardTab {...metrics} />
            ) : null}
            {activeTab === 'management' ? <TrainersManagementTab /> : null}
            {activeTab === 'attendance-sessions' ? <TrainersAttendanceSessionsTab /> : null}
            {activeTab === 'payroll' ? <TrainersPayrollTab /> : null}
            {activeTab === 'reports' ? <TrainersReportsTab /> : null}
            {activeTab === 'documents' ? <TrainersDocumentsTab /> : null}
          </div>
        </DashboardSubpageShell>
      </div>
    </DashboardLayout>
  )
}
