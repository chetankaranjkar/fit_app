import { useDashboardRole } from '../../features/auth/DashboardRoleContext'
import { isStaffFrontDeskOnly } from '../../features/auth/navPermissions'
import { AdminDashboardPage } from './AdminDashboardPage'
import { FrontDeskDashboardPage } from './FrontDeskDashboardPage'
import { TrainerDashboardPage } from './TrainerDashboardPage'
import { MemberDashboardPage } from './MemberDashboardPage'

/** Renders the correct home dashboard for the logged-in role. */
export function DashboardHubPage() {
  const role = useDashboardRole()

  if (role === 'trainer') return <TrainerDashboardPage />
  if (role === 'member') return <MemberDashboardPage />
  if (isStaffFrontDeskOnly()) return <FrontDeskDashboardPage />
  return <AdminDashboardPage />
}
