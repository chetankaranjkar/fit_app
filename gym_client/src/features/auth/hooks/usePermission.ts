import { useMemo } from 'react'
import { authService } from '../../../services/auth.service'

export function usePermission(permissionCode: string) {
  return useMemo(() => authService.hasPermission(permissionCode), [permissionCode])
}
