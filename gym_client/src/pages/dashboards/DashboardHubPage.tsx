import { useDashboardRole } from '../../features/auth/DashboardRoleContext'
import { AdminDashboardPage } from './AdminDashboardPage'
import { FrontDeskDashboardPage } from './FrontDeskDashboardPage'
import { TrainerDashboardPage } from './TrainerDashboardPage'
import { MemberDashboardPage } from './MemberDashboardPage'

/** Renders the correct home dashboard for the active persona. */
export function DashboardHubPage() {
  const role = useDashboardRole()

  if (role === 'trainer') return <TrainerDashboardPage />
  if (role === 'member') return <MemberDashboardPage />
  if (role === 'other') return <FrontDeskDashboardPage />
  return <AdminDashboardPage />
}
