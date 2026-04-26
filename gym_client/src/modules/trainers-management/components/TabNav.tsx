import type { TrainerModuleTab } from '../types'

const tabs: Array<{ id: TrainerModuleTab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'management', label: 'Management' },
  { id: 'attendance-sessions', label: 'Attendance & Sessions' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'reports', label: 'Reports' },
  { id: 'documents', label: 'Documents' },
]

export function TrainersTabNav({
  activeTab,
  onChange,
}: {
  activeTab: TrainerModuleTab
  onChange: (tab: TrainerModuleTab) => void
}) {
  return (
    <div className="glass-card dashboard-card rounded-2xl p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
