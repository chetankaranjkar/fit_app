import { usePermission } from '../../features/auth/hooks/usePermission'

export function PermissionGate({
  permission,
  fallback = null,
  children,
}: {
  permission: string
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const allowed = usePermission(permission)
  return allowed ? <>{children}</> : <>{fallback}</>
}
