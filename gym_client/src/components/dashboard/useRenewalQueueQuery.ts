import { useQuery } from '@tanstack/react-query'
import { userMembershipsService } from '../../services/userMemberships.service'
import { RENEWAL_QUEUE_QUERY_KEY } from '../../lib/dashboardQueryKeys'

export const RENEWAL_QUEUE_WITHIN_DAYS = 14
export const RENEWAL_QUEUE_PAGE_SIZE = 12

/** Single source for the dashboard renewal queue; the panel and the daily work list share this cache entry. */
export function useRenewalQueueQuery(enabled: boolean, search = '') {
  return useQuery({
    queryKey: [...RENEWAL_QUEUE_QUERY_KEY, RENEWAL_QUEUE_WITHIN_DAYS, search],
    queryFn: () =>
      userMembershipsService.getExpiringQueue({
        withinDays: RENEWAL_QUEUE_WITHIN_DAYS,
        page: 1,
        pageSize: RENEWAL_QUEUE_PAGE_SIZE,
        search: search.trim() || undefined,
      }),
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}
