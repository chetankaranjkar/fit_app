import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  gymOperationsService,
  type EquipmentInput,
} from '../services/gymOperations.service'
import {
  MOCK_CLEANING,
  MOCK_EQUIPMENT,
  MOCK_EXPENSES,
  MOCK_MAINTENANCE,
  MOCK_VENDORS,
} from '../services/mockData'
import type { MaintenanceInput, MaintenanceLog } from '../types'

const NAMESPACE = ['gym-operations'] as const
const EQUIPMENT_KEY = [...NAMESPACE, 'equipment']
const MAINTENANCE_KEY = [...NAMESPACE, 'maintenance']

export function useEquipment() {
  return useQuery({
    queryKey: EQUIPMENT_KEY,
    queryFn: () =>
      gymOperationsService.listEquipment().catch(() => MOCK_EQUIPMENT),
    placeholderData: MOCK_EQUIPMENT,
  })
}

export function useCreateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EquipmentInput) =>
      gymOperationsService.createEquipment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
    },
  })
}

export function useUpdateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EquipmentInput }) =>
      gymOperationsService.updateEquipment(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
    },
  })
}

export function useDeleteEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => gymOperationsService.deleteEquipment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
    },
  })
}

export function useMaintenance() {
  return useQuery({
    queryKey: MAINTENANCE_KEY,
    queryFn: () =>
      gymOperationsService.listMaintenance().catch(() => MOCK_MAINTENANCE),
    placeholderData: MOCK_MAINTENANCE,
  })
}

/**
 * Create a new maintenance log.
 *
 * The service falls back to a locally-generated mock entry if the backend
 * POST endpoint isn't available yet, so we also prepend the returned log to
 * the cache directly. That way the new row shows up instantly regardless of
 * whether the API persisted it, and `invalidateQueries` still refetches the
 * canonical list when the server does respond.
 */
export function useCreateMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      input,
      equipmentName,
    }: {
      input: MaintenanceInput
      equipmentName: string
    }) => gymOperationsService.createMaintenance(input, equipmentName),
    onSuccess: (newLog) => {
      qc.setQueryData<MaintenanceLog[]>(MAINTENANCE_KEY, (prev) => {
        const base = prev ?? []
        if (base.some((l) => l.id === newLog.id)) return base
        return [newLog, ...base]
      })
      qc.invalidateQueries({ queryKey: MAINTENANCE_KEY })
    },
  })
}

export function useExpenses() {
  return useQuery({
    queryKey: [...NAMESPACE, 'expenses'],
    queryFn: () =>
      gymOperationsService.listExpenses().catch(() => MOCK_EXPENSES),
    placeholderData: MOCK_EXPENSES,
  })
}

export function useCleaning() {
  return useQuery({
    queryKey: [...NAMESPACE, 'cleaning'],
    queryFn: () =>
      gymOperationsService.listCleaning().catch(() => MOCK_CLEANING),
    placeholderData: MOCK_CLEANING,
  })
}

export function useVendors() {
  return useQuery({
    queryKey: [...NAMESPACE, 'vendors'],
    queryFn: () =>
      gymOperationsService.listVendors().catch(() => MOCK_VENDORS),
    placeholderData: MOCK_VENDORS,
  })
}
