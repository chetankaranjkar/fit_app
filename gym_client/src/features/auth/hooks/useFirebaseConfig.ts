import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { authService } from '../../../services/auth.service'
import { logFirebaseStartupAudit } from '../../../lib/firebaseDiagnostics'

export function useFirebaseConfig() {
  const query = useQuery({
    queryKey: ['firebase-config'],
    queryFn: () => authService.fetchFirebaseConfig(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  useEffect(() => {
    if (query.data) logFirebaseStartupAudit(query.data)
  }, [query.data])

  return query
}
