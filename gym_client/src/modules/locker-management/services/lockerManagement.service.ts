/**
 * Locker Management module — service layer.
 *
 * - Calls real API endpoints under `/api/locker-management/*` via the
 *   existing axios client when `USE_API = true`.
 * - Transparently falls back to in-module mock data if the call fails,
 *   so the UI never breaks during backend downtime or local demos.
 *
 * Isolation:
 *   - Does NOT modify the shared axios instance or any other service.
 *   - Keeps all API<->UI mapping local to this file.
 */

import { api } from '../../../lib/api'
import type {
  AccessAction,
  Locker,
  LockerAccessLog,
  LockerAssignment,
  LockerMaintenance,
  LockerSize,
  LockerStatus,
  MaintenanceStatus,
} from '../types'
import {
  MOCK_ACCESS_LOGS,
  MOCK_ASSIGNMENTS,
  MOCK_LOCKERS,
  MOCK_MAINTENANCE,
} from './mockData'

const USE_API = true

// ---------------------------------------------------------------------------
// API DTO shapes (mirror backend models in GymManagement.Core.DTOs.LockerMgmt)
// ---------------------------------------------------------------------------

interface ApiLocker {
  id: number
  lockerNumber: string
  size: string
  status: string
  location?: string | null
}

interface ApiAssignment {
  id: number
  lockerId: number
  lockerNumber: string
  memberName: string
  assignedDate: string
  expiryDate: string
}

interface ApiAccessLog {
  id: number
  lockerId: number
  lockerNumber: string
  memberName: string
  action: string
  accessTime: string
}

interface ApiMaintenance {
  id: number
  lockerId: number
  lockerNumber: string
  issue: string
  reportedDate: string
  status: string
}

// ---------------------------------------------------------------------------
// Mappers (API -> UI)
// ---------------------------------------------------------------------------

const toSize = (v: string): LockerSize => {
  const n = (v ?? '').trim()
  if (n === 'Small' || n === 'Medium' || n === 'Large') return n
  if (n.toUpperCase() === 'SMALL') return 'Small'
  if (n.toUpperCase() === 'MEDIUM') return 'Medium'
  if (n.toUpperCase() === 'LARGE') return 'Large'
  return 'Medium'
}

const toStatus = (v: string): LockerStatus => {
  const n = (v ?? '').toUpperCase().trim()
  if (n === 'AVAILABLE' || n === 'OCCUPIED' || n === 'MAINTENANCE') return n
  return 'AVAILABLE'
}

const toAction = (v: string): AccessAction =>
  (v ?? '').toUpperCase() === 'CLOSE' ? 'CLOSE' : 'OPEN'

const toMaintenanceStatus = (v: string): MaintenanceStatus =>
  (v ?? '').toUpperCase() === 'FIXED' ? 'FIXED' : 'PENDING'

const mapLocker = (a: ApiLocker): Locker => ({
  id: String(a.id),
  lockerNumber: a.lockerNumber,
  size: toSize(a.size),
  status: toStatus(a.status),
  location: a.location ?? undefined,
})

const mapAssignment = (a: ApiAssignment): LockerAssignment => ({
  id: String(a.id),
  lockerId: String(a.lockerId),
  lockerNumber: a.lockerNumber,
  memberName: a.memberName,
  assignedDate: a.assignedDate,
  expiryDate: a.expiryDate,
})

const mapAccessLog = (a: ApiAccessLog): LockerAccessLog => ({
  id: String(a.id),
  lockerId: String(a.lockerId),
  lockerNumber: a.lockerNumber,
  memberName: a.memberName,
  action: toAction(a.action),
  accessTime: a.accessTime,
})

const mapMaintenance = (a: ApiMaintenance): LockerMaintenance => ({
  id: String(a.id),
  lockerId: String(a.lockerId),
  lockerNumber: a.lockerNumber,
  issue: a.issue,
  reportedDate: a.reportedDate,
  status: toMaintenanceStatus(a.status),
})

// ---------------------------------------------------------------------------
// Generic helper: fetch-with-mock-fallback
// ---------------------------------------------------------------------------

async function fetchWithFallback<TApi, TModel>(
  path: string,
  map: (value: TApi) => TModel,
  mock: TModel[],
): Promise<TModel[]> {
  if (!USE_API) return mock
  try {
    const res = await api.get<TApi[]>(path)
    const data = Array.isArray(res.data) ? res.data : []
    return data.map(map)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[locker-management] falling back to mock for ${path}`, err)
    }
    return mock
  }
}

// ---------------------------------------------------------------------------
// Mutation payloads
// ---------------------------------------------------------------------------

export interface LockerInput {
  lockerNumber: string
  size: LockerSize
  status: LockerStatus
  location?: string
}

export interface AssignmentInput {
  lockerId: string
  memberName: string
  assignedDate: string
  expiryDate: string
}

export interface AccessLogInput {
  lockerId: string
  memberName: string
  action: AccessAction
  accessTime?: string
}

export interface MaintenanceInput {
  lockerId: string
  issue: string
  reportedDate: string
  status: MaintenanceStatus
}

const toApiLockerPayload = (i: LockerInput) => ({
  lockerNumber: i.lockerNumber,
  size: i.size,
  status: i.status,
  location: i.location ?? null,
})

const toApiAssignmentPayload = (i: AssignmentInput) => ({
  lockerId: Number(i.lockerId),
  memberName: i.memberName,
  assignedDate: i.assignedDate,
  expiryDate: i.expiryDate,
})

const toApiAccessLogPayload = (i: AccessLogInput) => ({
  lockerId: Number(i.lockerId),
  memberName: i.memberName,
  action: i.action,
  accessTime: i.accessTime ?? null,
})

const toApiMaintenancePayload = (i: MaintenanceInput) => ({
  lockerId: Number(i.lockerId),
  issue: i.issue,
  reportedDate: i.reportedDate,
  status: i.status,
})

// ---------------------------------------------------------------------------
// Mock-mode helpers (believable offline objects)
// ---------------------------------------------------------------------------

const mockLocker = (i: LockerInput): Locker => ({
  id: `mock-lk-${Date.now()}`,
  lockerNumber: i.lockerNumber,
  size: i.size,
  status: i.status,
  location: i.location,
})

const mockAssignment = (i: AssignmentInput, lockerNumber: string): LockerAssignment => ({
  id: `mock-as-${Date.now()}`,
  lockerId: i.lockerId,
  lockerNumber,
  memberName: i.memberName,
  assignedDate: i.assignedDate,
  expiryDate: i.expiryDate,
})

const mockAccessLog = (i: AccessLogInput, lockerNumber: string): LockerAccessLog => ({
  id: `mock-al-${Date.now()}`,
  lockerId: i.lockerId,
  lockerNumber,
  memberName: i.memberName,
  action: i.action,
  accessTime: i.accessTime ?? new Date().toISOString(),
})

const mockMaintenance = (i: MaintenanceInput, lockerNumber: string): LockerMaintenance => ({
  id: `mock-mt-${Date.now()}`,
  lockerId: i.lockerId,
  lockerNumber,
  issue: i.issue,
  reportedDate: i.reportedDate,
  status: i.status,
})

// ---------------------------------------------------------------------------
// Public service API
// ---------------------------------------------------------------------------

export const lockerManagementService = {
  // ---- Lockers ------------------------------------------------------------
  listLockers: (): Promise<Locker[]> =>
    fetchWithFallback<ApiLocker, Locker>(
      '/locker-management/lockers',
      mapLocker,
      MOCK_LOCKERS,
    ),

  async createLocker(input: LockerInput): Promise<Locker> {
    if (!USE_API) return mockLocker(input)
    try {
      const res = await api.post<ApiLocker>(
        '/locker-management/lockers',
        toApiLockerPayload(input),
      )
      return mapLocker(res.data)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[locker-management] createLocker fallback', err)
      return mockLocker(input)
    }
  },

  async updateLocker(id: string, input: LockerInput): Promise<Locker> {
    if (!USE_API) return { ...mockLocker(input), id }
    try {
      const res = await api.put<ApiLocker>(
        `/locker-management/lockers/${id}`,
        toApiLockerPayload(input),
      )
      return mapLocker(res.data)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[locker-management] updateLocker fallback', err)
      return { ...mockLocker(input), id }
    }
  },

  async deleteLocker(id: string): Promise<void> {
    if (!USE_API) return
    try {
      await api.delete(`/locker-management/lockers/${id}`)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[locker-management] deleteLocker fallback', err)
    }
  },

  // ---- Assignments --------------------------------------------------------
  listAssignments: (): Promise<LockerAssignment[]> =>
    fetchWithFallback<ApiAssignment, LockerAssignment>(
      '/locker-management/assignments',
      mapAssignment,
      MOCK_ASSIGNMENTS,
    ),

  async createAssignment(input: AssignmentInput, lockerNumber: string): Promise<LockerAssignment> {
    if (!USE_API) return mockAssignment(input, lockerNumber)
    try {
      const res = await api.post<ApiAssignment>(
        '/locker-management/assignments',
        toApiAssignmentPayload(input),
      )
      return mapAssignment(res.data)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[locker-management] createAssignment fallback', err)
      return mockAssignment(input, lockerNumber)
    }
  },

  async deleteAssignment(id: string): Promise<void> {
    if (!USE_API) return
    try {
      await api.delete(`/locker-management/assignments/${id}`)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[locker-management] deleteAssignment fallback', err)
    }
  },

  // ---- Access logs --------------------------------------------------------
  listAccessLogs: (): Promise<LockerAccessLog[]> =>
    fetchWithFallback<ApiAccessLog, LockerAccessLog>(
      '/locker-management/access-logs',
      mapAccessLog,
      MOCK_ACCESS_LOGS,
    ),

  async createAccessLog(input: AccessLogInput, lockerNumber: string): Promise<LockerAccessLog> {
    if (!USE_API) return mockAccessLog(input, lockerNumber)
    try {
      const res = await api.post<ApiAccessLog>(
        '/locker-management/access-logs',
        toApiAccessLogPayload(input),
      )
      return mapAccessLog(res.data)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[locker-management] createAccessLog fallback', err)
      return mockAccessLog(input, lockerNumber)
    }
  },

  // ---- Maintenance --------------------------------------------------------
  listMaintenance: (): Promise<LockerMaintenance[]> =>
    fetchWithFallback<ApiMaintenance, LockerMaintenance>(
      '/locker-management/maintenance',
      mapMaintenance,
      MOCK_MAINTENANCE,
    ),

  async createMaintenance(input: MaintenanceInput, lockerNumber: string): Promise<LockerMaintenance> {
    if (!USE_API) return mockMaintenance(input, lockerNumber)
    try {
      const res = await api.post<ApiMaintenance>(
        '/locker-management/maintenance',
        toApiMaintenancePayload(input),
      )
      return mapMaintenance(res.data)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[locker-management] createMaintenance fallback', err)
      return mockMaintenance(input, lockerNumber)
    }
  },

  async updateMaintenanceStatus(id: string, status: MaintenanceStatus): Promise<LockerMaintenance | null> {
    if (!USE_API) return null
    try {
      const res = await api.patch<ApiMaintenance>(
        `/locker-management/maintenance/${id}/status`,
        { status },
      )
      return mapMaintenance(res.data)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[locker-management] updateMaintenanceStatus fallback', err)
      return null
    }
  },
}
