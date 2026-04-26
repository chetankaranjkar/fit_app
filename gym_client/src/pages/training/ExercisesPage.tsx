import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'

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

export function ExercisesPage() {
  const { userName } = getDashboardUser()
  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Training"
        titleGradient="exercises"
        subtitle="Exercise library and metadata — full editor coming soon."
        showExport={false}
      >
        <section className="glass-card dashboard-card min-w-0 rounded-2xl p-6">
          <h2 className="mb-2 border-b border-white/10 pb-3 text-lg font-semibold text-white">Overview</h2>
          <p className="text-sm text-slate-400">Exercises management – coming soon.</p>
        </section>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
