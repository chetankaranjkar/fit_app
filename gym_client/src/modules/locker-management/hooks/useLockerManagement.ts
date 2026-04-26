import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  lockerManagementService,
  type AccessLogInput,
  type AssignmentInput,
  type LockerInput,
  type MaintenanceInput,
} from '../services/lockerManagement.service'
import {
  MOCK_ACCESS_LOGS,
  MOCK_ASSIGNMENTS,
  MOCK_LOCKERS,
  MOCK_MAINTENANCE,
} from '../services/mockData'
import type { MaintenanceStatus } from '../types'

const NAMESPACE = ['locker-management'] as const
const LOCKERS_KEY = [...NAMESPACE, 'lockers']
const ASSIGNMENTS_KEY = [...NAMESPACE, 'assignments']
const ACCESS_LOGS_KEY = [...NAMESPACE, 'access-logs']
const MAINTENANCE_KEY = [...NAMESPACE, 'maintenance']

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useLockers() {
  return useQuery({
    queryKey: LOCKERS_KEY,
    queryFn: () =>
      lockerManagementService.listLockers().catch(() => MOCK_LOCKERS),
    placeholderData: MOCK_LOCKERS,
  })
}

export function useAssignments() {
  return useQuery({
    queryKey: ASSIGNMENTS_KEY,
    queryFn: () =>
      lockerManagementService.listAssignments().catch(() => MOCK_ASSIGNMENTS),
    placeholderData: MOCK_ASSIGNMENTS,
  })
}

export function useAccessLogs() {
  return useQuery({
    queryKey: ACCESS_LOGS_KEY,
    queryFn: () =>
      lockerManagementService.listAccessLogs().catch(() => MOCK_ACCESS_LOGS),
    placeholderData: MOCK_ACCESS_LOGS,
  })
}

export function useMaintenance() {
  return useQuery({
    queryKey: MAINTENANCE_KEY,
    queryFn: () =>
      lockerManagementService.listMaintenance().catch(() => MOCK_MAINTENANCE),
    placeholderData: MOCK_MAINTENANCE,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateLocker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LockerInput) =>
      lockerManagementService.createLocker(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOCKERS_KEY })
    },
  })
}

export function useUpdateLocker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LockerInput }) =>
      lockerManagementService.updateLocker(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOCKERS_KEY })
    },
  })
}

export function useDeleteLocker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => lockerManagementService.deleteLocker(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOCKERS_KEY })
    },
  })
}

export function useCreateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, lockerNumber }: { input: AssignmentInput; lockerNumber: string }) =>
      lockerManagementService.createAssignment(input, lockerNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY })
      qc.invalidateQueries({ queryKey: LOCKERS_KEY })
    },
  })
}

export function useDeleteAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => lockerManagementService.deleteAssignment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY })
      qc.invalidateQueries({ queryKey: LOCKERS_KEY })
    },
  })
}

export function useCreateAccessLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, lockerNumber }: { input: AccessLogInput; lockerNumber: string }) =>
      lockerManagementService.createAccessLog(input, lockerNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACCESS_LOGS_KEY })
    },
  })
}

export function useCreateMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, lockerNumber }: { input: MaintenanceInput; lockerNumber: string }) =>
      lockerManagementService.createMaintenance(input, lockerNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MAINTENANCE_KEY })
      qc.invalidateQueries({ queryKey: LOCKERS_KEY })
    },
  })
}

export function useUpdateMaintenanceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
      lockerManagementService.updateMaintenanceStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MAINTENANCE_KEY })
      qc.invalidateQueries({ queryKey: LOCKERS_KEY })
    },
  })
}
