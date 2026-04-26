import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  seededAdjustments,
  seededAttendance,
  seededDocuments,
  seededPayrollHistory,
  seededSessions,
  seededTrainers,
} from './mockData'
import type {
  AttendanceEntry,
  AttendanceStatus,
  PayrollAdjustment,
  PayrollEntry,
  PayrollStatus,
  SessionEntry,
  TrainerDocument,
  TrainerFormValues,
  TrainerRecord,
} from './types'
import { salaryBaseForTrainer } from './utils'

type NewDocument = Omit<TrainerDocument, 'id' | 'uploadedAt'>

interface TrainersModuleState {
  trainers: TrainerRecord[]
  attendance: AttendanceEntry[]
  sessions: SessionEntry[]
  adjustments: PayrollAdjustment[]
  payrollHistory: PayrollEntry[]
  documents: TrainerDocument[]
  uiTheme: 'dark' | 'light'
  addTrainer: (payload: TrainerFormValues) => void
  updateTrainer: (id: string, payload: TrainerFormValues) => void
  softDeleteTrainer: (id: string) => void
  markAttendance: (trainerId: string, date: string, status: AttendanceStatus) => void
  addSession: (trainerId: string, date: string, title: string, count: number) => void
  addAdjustment: (payload: Omit<PayrollAdjustment, 'id'>) => void
  savePayroll: (month: string, trainerId: string, status: PayrollStatus) => void
  addDocument: (payload: NewDocument) => void
  setTheme: (theme: 'dark' | 'light') => void
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useTrainersModuleStore = create<TrainersModuleState>()(
  persist(
    (set, get) => ({
      trainers: seededTrainers,
      attendance: seededAttendance,
      sessions: seededSessions,
      adjustments: seededAdjustments,
      payrollHistory: seededPayrollHistory,
      documents: seededDocuments,
      uiTheme: 'dark',
      addTrainer: (payload) =>
        set((state) => ({
          trainers: [
            ...state.trainers,
            { id: makeId('tr'), ...payload, status: 'active' },
          ],
        })),
      updateTrainer: (id, payload) =>
        set((state) => ({
          trainers: state.trainers.map((trainer) =>
            trainer.id === id ? { ...trainer, ...payload } : trainer,
          ),
        })),
      softDeleteTrainer: (id) =>
        set((state) => ({
          trainers: state.trainers.map((trainer) =>
            trainer.id === id ? { ...trainer, status: 'inactive' } : trainer,
          ),
        })),
      markAttendance: (trainerId, date, status) =>
        set((state) => {
          const existing = state.attendance.find(
            (entry) => entry.trainerId === trainerId && entry.date === date,
          )
          if (existing) {
            return {
              attendance: state.attendance.map((entry) =>
                entry.id === existing.id ? { ...entry, status } : entry,
              ),
            }
          }
          return {
            attendance: [
              ...state.attendance,
              { id: makeId('at'), trainerId, date, status },
            ],
          }
        }),
      addSession: (trainerId, date, title, count) =>
        set((state) => ({
          sessions: [
            ...state.sessions,
            { id: makeId('ss'), trainerId, date, title, count: Math.max(1, count) },
          ],
        })),
      addAdjustment: (payload) =>
        set((state) => ({
          adjustments: [...state.adjustments, { ...payload, id: makeId('adj') }],
        })),
      savePayroll: (month, trainerId, status) => {
        const trainer = get().trainers.find((item) => item.id === trainerId)
        if (!trainer) return
        const sessions = get().sessions
          .filter((entry) => entry.trainerId === trainerId && entry.date.startsWith(month))
          .reduce((sum, entry) => sum + entry.count, 0)
        const adjustments = get().adjustments
          .filter((entry) => entry.trainerId === trainerId && entry.month === month)
          .reduce(
            (sum, entry) => sum + (entry.type === 'bonus' ? entry.amount : -entry.amount),
            0,
          )
        const baseAmount = salaryBaseForTrainer(trainer, sessions)
        const finalAmount = Math.max(0, baseAmount + adjustments)
        set((state) => ({
          payrollHistory: [
            ...state.payrollHistory,
            {
              id: makeId('pr'),
              trainerId,
              month,
              baseAmount,
              adjustmentAmount: adjustments,
              finalAmount,
              status,
              paidOn: status === 'paid' ? new Date().toISOString().slice(0, 10) : undefined,
            },
          ],
        }))
      },
      addDocument: (payload) =>
        set((state) => ({
          documents: [
            ...state.documents,
            {
              id: makeId('doc'),
              uploadedAt: new Date().toISOString(),
              ...payload,
            },
          ],
        })),
      setTheme: (theme) => set({ uiTheme: theme }),
    }),
    { name: 'gym-trainers-module-v1' },
  ),
)
