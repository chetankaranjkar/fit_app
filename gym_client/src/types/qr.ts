export interface QrGenerateResponseDto {
  gymQrCodeId: number
  branchId: number
  qrToken: string
  expiryDateUtc: string
  createdDateUtc: string
}

export interface BranchOptionDto {
  id: number
  branchName: string
  latitude?: number | null
  longitude?: number | null
  esp32DoorBaseUrl?: string | null
}

export interface BranchQrAccessPutDto {
  latitude?: number | null
  longitude?: number | null
  esp32DoorBaseUrl?: string | null
}

export interface QrScanLogDto {
  attendanceLogId: number
  checkInTimeUtc: string
  notes?: string | null
  userId?: number | null
  memberName?: string | null
}

export interface QrOwnerDashboardDto {
  activeQr: QrGenerateResponseDto | null
  expiresWithinThreeDays: boolean
  /** Mirrors API `branchIsActive` (inactive branches cannot rotate QR until reactivated). */
  branchIsActive?: boolean
  branchGeoConfigured: boolean
  branchDoorUrlConfigured?: boolean
  branchLatitude?: number | null
  branchLongitude?: number | null
  esp32DoorBaseUrl?: string | null
  branchName?: string | null
  recentScans: QrScanLogDto[]
}

export interface QrScanRequestDto {
  qrToken: string
  latitude: number
  longitude: number
}

export interface QrScanResponseDto {
  success: boolean
  message?: string | null
  attendanceLogId?: number | null
  doorUnlockAttempted: boolean
  doorUnlockOk: boolean
  branchId?: number | null
}

/** POST /api/attendance/scan — Redis replay + rate limit + gym-floor workout session. */
export interface AttendanceScanResponseDto extends QrScanResponseDto {
  sessionId?: string | null
  sessionStartTimeUtc?: string | null
  errorCode?: string | null
}
