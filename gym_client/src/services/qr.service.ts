import { api } from '../lib/api'
import type {
  BranchOptionDto,
  QrGenerateResponseDto,
  QrOwnerDashboardDto,
  QrScanRequestDto,
  QrScanResponseDto,
} from '../types/qr'

export const qrService = {
  getBranches: () => api.get<BranchOptionDto[]>('/qr/branches'),

  getOwnerDashboard: (branchId: number) =>
    api.get<QrOwnerDashboardDto>('/qr/owner-dashboard', { params: { branchId } }),

  generate: (branchId: number) =>
    api.post<QrGenerateResponseDto>('/qr/generate', { branchId }),

  scan: (body: QrScanRequestDto) => api.post<QrScanResponseDto>('/qr/scan', body),
}
