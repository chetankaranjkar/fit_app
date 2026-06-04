import { useQuery } from '@tanstack/react-query'
import { fetchOwnerAnalyticsSnapshot } from '../services/ownerAnalyticsApi'
import { KPI_SNAPSHOT } from '../services/mockData'

export function useOwnerAnalyticsData() {
  return useQuery({
    queryKey: ['owner-analytics-data'],
    queryFn: fetchOwnerAnalyticsSnapshot,
    staleTime: 1000 * 60 * 2,
    placeholderData: {
      revenue: KPI_SNAPSHOT.revenue,
      memberKpis: KPI_SNAPSHOT.members,
      payments: KPI_SNAPSHOT.payments,
      equipment: KPI_SNAPSHOT.equipment,
      revenue30d: [],
      recentPayments: [],
      pendingDues: [],
      memberRows: [],
      equipmentIssues: [],
      planBuckets: [],
    },
  })
}
