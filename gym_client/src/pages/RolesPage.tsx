import { useState } from 'react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { PermissionGate } from '../components/auth/PermissionGate'
import { RolePermissionsTab } from '../components/roles/RolePermissionsTab'
import { UserRolesTab } from '../components/roles/UserRolesTab'
import { authService } from '../services/auth.service'

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

type RolesTab = 'permissions' | 'users'

export function RolesPage() {
  const { userName } = getDashboardUser()
  const [activeTab, setActiveTab] = useState<RolesTab>('permissions')

  return (
    <DashboardLayout userName={userName}>
      <PermissionGate
        permission={authService.permissionCodes.config}
        fallback={
          <div className="glass-card dashboard-card rounded-2xl p-6 text-sm text-amber-200">
            You do not have permission to manage roles. Ask an admin to grant Config access.
          </div>
        }
      >
        <DashboardSubpageShell
          eyebrow="Access control"
          titleBefore="Roles & "
          titleGradient="permissions"
          subtitle="Define role permissions and assign application roles to users."
        >
          <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeTab === 'permissions'
                  ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              Role permissions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeTab === 'users'
                  ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              User roles
            </button>
          </div>

          <div className="glass-card dashboard-card min-w-0 rounded-2xl p-6">
            <h2 className="mb-1 text-xl font-semibold text-white">
              {activeTab === 'permissions' ? 'Role permissions' : 'User roles'}
            </h2>
            {activeTab === 'permissions' ? <RolePermissionsTab /> : <UserRolesTab />}
          </div>
        </DashboardSubpageShell>
      </PermissionGate>
    </DashboardLayout>
  )
}
