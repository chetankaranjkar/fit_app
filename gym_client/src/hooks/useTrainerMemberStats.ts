import { useQueries, useQuery } from '@tanstack/react-query'
import { MEMBER_BATCH_META, MEMBER_BATCH_VALUES, type MemberBatchValue } from '../lib/memberBatches'
import { usersService } from '../services/users.service'

export type MemberBatchStat = {
  key: MemberBatchValue | 'Unassigned'
  label: string
  count: number
  barClass: string
}

/** @deprecated Use MemberBatchStat */
export type TrainerBatchStat = MemberBatchStat

type UseMemberDirectoryStatsOptions = {
  assignedToCoachOnly?: boolean
}

function statsQueryKey(scope: 'coach' | 'all', segment: string, extra?: string) {
  return ['member-directory-stats', scope, segment, extra].filter(Boolean) as string[]
}

export function useMemberDirectoryStats(
  enabled: boolean,
  { assignedToCoachOnly = false }: UseMemberDirectoryStatsOptions = {},
) {
  const scope = assignedToCoachOnly ? 'coach' : 'all'
  const statsBase = {
    membersOnly: true,
    assignedToCoachOnly,
    includeBilling: false as const,
    page: 1,
    pageSize: 1,
  }

  const totalQuery = useQuery({
    queryKey: statsQueryKey(scope, 'total'),
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await usersService.getPaged(statsBase)
      return data.totalCount ?? 0
    },
  })

  const activeQuery = useQuery({
    queryKey: statsQueryKey(scope, 'active'),
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await usersService.getPaged({ ...statsBase, isActive: true })
      return data.totalCount ?? 0
    },
  })

  const inactiveQuery = useQuery({
    queryKey: statsQueryKey(scope, 'inactive'),
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await usersService.getPaged({ ...statsBase, isActive: false })
      return data.totalCount ?? 0
    },
  })

  const batchQueries = useQueries({
    queries: MEMBER_BATCH_VALUES.map((batch) => ({
      queryKey: statsQueryKey(scope, 'batch', batch),
      enabled,
      staleTime: 60_000,
      queryFn: async () => {
        const { data } = await usersService.getPaged({
          ...statsBase,
          preferredGymTime: batch,
        })
        return { batch, count: data.totalCount ?? 0 }
      },
    })),
  })

  const total = totalQuery.data ?? 0
  const active = activeQuery.data ?? 0
  const inactive = inactiveQuery.data ?? 0

  const knownBatchTotal = batchQueries.reduce((sum, q) => sum + (q.data?.count ?? 0), 0)
  const unassignedCount = Math.max(0, total - knownBatchTotal)

  const batches: MemberBatchStat[] = MEMBER_BATCH_VALUES.map((batch, index) => {
    const meta = MEMBER_BATCH_META[batch]
    return {
      key: batch,
      label: meta.label,
      count: batchQueries[index]?.data?.count ?? 0,
      barClass: meta.barClass,
    }
  })

  if (unassignedCount > 0) {
    batches.push({
      key: 'Unassigned',
      label: 'Unassigned',
      count: unassignedCount,
      barClass: 'bg-gradient-to-r from-slate-500 to-slate-400',
    })
  }

  const maxBatchCount = Math.max(1, ...batches.map((b) => b.count))

  const isLoading =
    totalQuery.isLoading
    || activeQuery.isLoading
    || inactiveQuery.isLoading
    || batchQueries.some((q) => q.isLoading)

  return { total, active, inactive, batches, maxBatchCount, isLoading }
}

/** Coach-scoped member stats for trainer dashboard. */
export function useTrainerMemberStats(enabled: boolean) {
  return useMemberDirectoryStats(enabled, { assignedToCoachOnly: true })
}
