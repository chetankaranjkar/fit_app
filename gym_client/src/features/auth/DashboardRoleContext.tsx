import { createContext, useContext, type ReactNode } from 'react'
import type { DashboardRole } from './roleRouting'
import { getCurrentDashboardRole } from './roleRouting'

const DashboardRoleContext = createContext<DashboardRole>('admin')

export function DashboardRoleProvider({
  value,
  children,
}: {
  value: DashboardRole
  children: ReactNode
}) {
  return <DashboardRoleContext.Provider value={value}>{children}</DashboardRoleContext.Provider>
}

export function useDashboardRole(): DashboardRole {
  return useContext(DashboardRoleContext)
}

export function useDashboardRoleOrCurrent(): DashboardRole {
  const ctx = useContext(DashboardRoleContext)
  return ctx ?? getCurrentDashboardRole()
}
