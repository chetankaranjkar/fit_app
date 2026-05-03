/** Matches API `BranchCrudDto` (camelCase JSON). */
export interface BranchCrudDto {
  id: number
  organizationId?: number | null
  organizationName?: string | null
  branchName: string
  address?: string | null
  contactNumber?: string | null
  latitude?: number | null
  longitude?: number | null
  esp32DoorBaseUrl?: string | null
  isActive: boolean
}

export interface BranchCreatePayload {
  organizationId?: number | null
  branchName: string
  address?: string | null
  contactNumber?: string | null
  latitude?: number | null
  longitude?: number | null
  esp32DoorBaseUrl?: string | null
}

export interface BranchUpdatePayload extends BranchCreatePayload {
  isActive: boolean
}

export interface OrganizationOptionDto {
  id: number
  name: string
}
