/**
 * Gym Operations module — service layer.
 *
 * Phase 2: calls real API endpoints under `/api/gym-operations/*` via the
 * existing axios client. If the call fails (network, 401, 500, etc.),
 * it transparently falls back to in-module mock data so the UI never breaks.
 *
 * Isolation:
 *   - Does NOT modify the shared axios instance.
 *   - Does NOT touch any other service.
 *   - Keeps all API<->UI mapping local to this file.
 *
 * Toggle USE_API=false to force mock data everywhere (useful for demos).
 */

import { api } from '../../../lib/api'
import type {
  CleaningLog,
  CleaningShift,
  CleaningTask,
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  MaintenanceInput,
  MaintenanceLog,
  MaintenanceType,
  Vendor,
  VendorCategory,
} from '../types'
import {
  MOCK_CLEANING,
  MOCK_EQUIPMENT,
  MOCK_EXPENSES,
  MOCK_MAINTENANCE,
  MOCK_VENDORS,
} from './mockData'

const USE_API = true

// ---------------------------------------------------------------------------
// API DTO shapes (mirror the backend models in GymManagement.Core.DTOs.GymOps)
// ---------------------------------------------------------------------------

interface ApiEquipment {
  id: number
  name: string
  category: string
  brand?: string | null
  serialNumber?: string | null
  location: string
  purchaseDate: string
  purchaseCost: number
  status: string
  nextServiceDate?: string | null
  notes?: string | null
}

interface ApiMaintenanceLog {
  id: number
  equipmentId: number
  equipmentName?: string | null
  type: string
  performedAt: string
  performedBy: string
  cost?: number | null
  description: string
  nextServiceDate?: string | null
}

interface ApiExpense {
  id: number
  category: string
  description: string
  amount: number
  expenseDate: string
  paymentStatus: string
  vendor?: string | null
  receiptUrl?: string | null
  notes?: string | null
}

interface ApiCleaningTask {
  id: number
  label: string
  isDone: boolean
}

interface ApiCleaningLog {
  id: number
  logDate: string
  area: string
  shift: string
  performedBy?: string | null
  notes?: string | null
  tasks: ApiCleaningTask[]
}

interface ApiVendor {
  id: number
  name: string
  category: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  rating?: number | null
  contractStatus: string
  contractStartDate?: string | null
  contractEndDate?: string | null
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Adapters — keep UI types stable regardless of backend evolution
// ---------------------------------------------------------------------------

const toEquipmentCategory = (value: string): EquipmentCategory => {
  switch (value) {
    case 'Cardio':
    case 'Strength':
    case 'Functional':
    case 'Accessory':
      return value
    default:
      return 'Accessory'
  }
}

const toEquipmentStatus = (value: string): EquipmentStatus => {
  switch (value) {
    case 'OPERATIONAL':
    case 'UNDER_MAINTENANCE':
    case 'OUT_OF_ORDER':
    case 'RETIRED':
      return value
    default:
      return 'OPERATIONAL'
  }
}

const toMaintenanceType = (value: string): MaintenanceType => {
  switch (value) {
    case 'ROUTINE':
    case 'REPAIR':
    case 'INSPECTION':
      return value
    default:
      return 'ROUTINE'
  }
}

const toExpenseCategory = (value: string): ExpenseCategory => {
  const upper = value?.toUpperCase?.() ?? ''
  switch (upper) {
    case 'UTILITIES':
      return 'Utilities'
    case 'MAINTENANCE':
      return 'Maintenance'
    case 'SUPPLIES':
      return 'Supplies'
    case 'MARKETING':
      return 'Marketing'
    case 'SALARIES':
      return 'Salaries'
    default:
      return 'Other'
  }
}

const toExpenseStatus = (value: string): ExpenseStatus =>
  value === 'PAID' ? 'PAID' : 'PENDING'

const toCleaningShift = (value: string): CleaningShift => {
  const upper = value?.toUpperCase?.() ?? ''
  if (upper === 'MORNING' || upper === 'AFTERNOON' || upper === 'EVENING') {
    return upper
  }
  return 'MORNING'
}

const toVendorCategory = (value: string): VendorCategory => {
  const upper = value?.toUpperCase?.() ?? ''
  switch (upper) {
    case 'EQUIPMENT':
      return 'Equipment'
    case 'CLEANING':
      return 'Cleaning'
    case 'MAINTENANCE':
      return 'Maintenance'
    case 'SUPPLIES':
    case 'SUPPLEMENTS':
      return 'Supplies'
    case 'IT':
      return 'IT'
    default:
      return 'Other'
  }
}

const mapEquipment = (e: ApiEquipment): Equipment => ({
  id: String(e.id),
  name: e.name,
  category: toEquipmentCategory(e.category),
  brand: e.brand ?? undefined,
  serialNumber: e.serialNumber ?? undefined,
  location: e.location,
  purchaseDate: e.purchaseDate,
  purchaseCost: e.purchaseCost,
  status: toEquipmentStatus(e.status),
  nextServiceDate: e.nextServiceDate ?? undefined,
  notes: e.notes ?? undefined,
})

const mapMaintenance = (m: ApiMaintenanceLog): MaintenanceLog => ({
  id: String(m.id),
  equipmentId: String(m.equipmentId),
  equipmentName: m.equipmentName ?? '',
  type: toMaintenanceType(m.type),
  performedAt: m.performedAt,
  performedBy: m.performedBy,
  cost: m.cost ?? undefined,
  description: m.description,
  nextServiceDate: m.nextServiceDate ?? undefined,
})

const mapExpense = (e: ApiExpense): Expense => ({
  id: String(e.id),
  category: toExpenseCategory(e.category),
  vendor: e.vendor ?? undefined,
  amount: e.amount,
  incurredAt: e.expenseDate,
  description: e.description,
  status: toExpenseStatus(e.paymentStatus),
})

const mapCleaningTask = (t: ApiCleaningTask): CleaningTask => ({
  id: String(t.id),
  label: t.label,
  done: t.isDone,
})

const mapCleaning = (l: ApiCleaningLog): CleaningLog => ({
  id: String(l.id),
  area: l.area,
  shift: toCleaningShift(l.shift),
  scheduledAt: l.logDate,
  performedBy: l.performedBy ?? undefined,
  performedAt: l.performedBy ? l.logDate : undefined,
  tasks: (l.tasks ?? []).map(mapCleaningTask),
})

const mapVendor = (v: ApiVendor): Vendor => ({
  id: String(v.id),
  name: v.name,
  category: toVendorCategory(v.category),
  contactPerson: v.contactPerson ?? undefined,
  email: v.email ?? undefined,
  phone: v.phone ?? undefined,
  rating: v.rating ?? undefined,
  onContract: (v.contractStatus ?? '').toUpperCase() === 'ACTIVE',
  notes: v.notes ?? undefined,
})

// ---------------------------------------------------------------------------
// Shared fetch wrapper — real API with mock fallback
// ---------------------------------------------------------------------------

async function fetchWithFallback<TApi, TModel>(
  apiPath: string,
  map: (value: TApi) => TModel,
  mock: TModel[],
): Promise<TModel[]> {
  if (!USE_API) return mock
  try {
    const res = await api.get<TApi[]>(apiPath)
    const data = Array.isArray(res.data) ? res.data : []
    return data.map(map)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[gym-operations] falling back to mock for ${apiPath}`, err)
    }
    return mock
  }
}

// ---------------------------------------------------------------------------
// Equipment mutation payloads (UI -> API)
// ---------------------------------------------------------------------------

export interface EquipmentInput {
  name: string
  category: string
  brand?: string
  serialNumber?: string
  location: string
  purchaseDate: string
  purchaseCost: number
  status: string
  nextServiceDate?: string
  notes?: string
}

const toApiEquipmentPayload = (input: EquipmentInput): Record<string, unknown> => ({
  name: input.name,
  category: input.category,
  brand: input.brand || null,
  serialNumber: input.serialNumber || null,
  location: input.location,
  purchaseDate: input.purchaseDate,
  purchaseCost: input.purchaseCost,
  status: input.status,
  nextServiceDate: input.nextServiceDate || null,
  notes: input.notes || null,
})

// Mock-mode helper — creates a believable Equipment object for offline demos.
const mockCreateEquipment = (input: EquipmentInput): Equipment => ({
  id: `mock-${Date.now()}`,
  name: input.name,
  category: toEquipmentCategory(input.category),
  brand: input.brand,
  serialNumber: input.serialNumber,
  location: input.location,
  purchaseDate: input.purchaseDate,
  purchaseCost: input.purchaseCost,
  status: toEquipmentStatus(input.status),
  nextServiceDate: input.nextServiceDate,
  notes: input.notes,
})

// ---------------------------------------------------------------------------
// Maintenance mutation payloads (UI -> API)
// ---------------------------------------------------------------------------

const toApiMaintenancePayload = (
  input: MaintenanceInput,
): Record<string, unknown> => ({
  equipmentId: Number.isFinite(Number(input.equipmentId))
    ? Number(input.equipmentId)
    : input.equipmentId,
  type: input.type,
  performedAt: input.performedAt,
  performedBy: input.performedBy,
  cost: input.cost ?? null,
  description: input.description,
  nextServiceDate: input.nextServiceDate || null,
})

const mockCreateMaintenance = (
  input: MaintenanceInput,
  equipmentName: string,
): MaintenanceLog => ({
  id: `mock-${Date.now()}`,
  equipmentId: input.equipmentId,
  equipmentName,
  type: input.type,
  performedAt: input.performedAt,
  performedBy: input.performedBy,
  cost: input.cost,
  description: input.description,
  nextServiceDate: input.nextServiceDate,
})

export const gymOperationsService = {
  listEquipment: (): Promise<Equipment[]> =>
    fetchWithFallback<ApiEquipment, Equipment>(
      '/gym-operations/equipment',
      mapEquipment,
      MOCK_EQUIPMENT,
    ),

  async createEquipment(input: EquipmentInput): Promise<Equipment> {
    if (!USE_API) return mockCreateEquipment(input)
    try {
      const res = await api.post<ApiEquipment>(
        '/gym-operations/equipment',
        toApiEquipmentPayload(input),
      )
      return mapEquipment(res.data)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[gym-operations] createEquipment fell back to mock', err)
      }
      return mockCreateEquipment(input)
    }
  },

  async updateEquipment(id: string, input: EquipmentInput): Promise<Equipment> {
    if (!USE_API) return { ...mockCreateEquipment(input), id }
    try {
      const res = await api.put<ApiEquipment>(
        `/gym-operations/equipment/${id}`,
        toApiEquipmentPayload(input),
      )
      return mapEquipment(res.data)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[gym-operations] updateEquipment fell back to mock', err)
      }
      return { ...mockCreateEquipment(input), id }
    }
  },

  async deleteEquipment(id: string): Promise<void> {
    if (!USE_API) return
    try {
      await api.delete(`/gym-operations/equipment/${id}`)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[gym-operations] deleteEquipment fell back (noop)', err)
      }
    }
  },
  listMaintenance: (): Promise<MaintenanceLog[]> =>
    fetchWithFallback<ApiMaintenanceLog, MaintenanceLog>(
      '/gym-operations/maintenance',
      mapMaintenance,
      MOCK_MAINTENANCE,
    ),

  async createMaintenance(
    input: MaintenanceInput,
    equipmentName: string,
  ): Promise<MaintenanceLog> {
    if (!USE_API) return mockCreateMaintenance(input, equipmentName)
    try {
      const res = await api.post<ApiMaintenanceLog>(
        '/gym-operations/maintenance',
        toApiMaintenancePayload(input),
      )
      const mapped = mapMaintenance(res.data)
      return {
        ...mapped,
        equipmentName: mapped.equipmentName || equipmentName,
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[gym-operations] createMaintenance fell back to mock', err)
      }
      return mockCreateMaintenance(input, equipmentName)
    }
  },
  listExpenses: (): Promise<Expense[]> =>
    fetchWithFallback<ApiExpense, Expense>(
      '/gym-operations/expenses',
      mapExpense,
      MOCK_EXPENSES,
    ),
  listCleaning: (): Promise<CleaningLog[]> =>
    fetchWithFallback<ApiCleaningLog, CleaningLog>(
      '/gym-operations/cleaning',
      mapCleaning,
      MOCK_CLEANING,
    ),
  listVendors: (): Promise<Vendor[]> =>
    fetchWithFallback<ApiVendor, Vendor>(
      '/gym-operations/vendors',
      mapVendor,
      MOCK_VENDORS,
    ),
}
