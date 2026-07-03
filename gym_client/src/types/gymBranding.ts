export type GymBranding = {
  gymName: string
  gymLogoUrl: string | null
  invoiceLogoUrl: string | null
}

export type UpdateGymBranding = {
  gymName: string
  gymLogoUrl?: string | null
  invoiceLogoUrl?: string | null
}
