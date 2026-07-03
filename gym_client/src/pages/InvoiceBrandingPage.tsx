import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { PermissionGate } from '../components/auth/PermissionGate'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { gymBrandingService } from '../services/gymBranding.service'
import { getApiErrorMessage } from '../lib/apiErrors'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

export function InvoiceBrandingPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [gymName, setGymName] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gym-branding'],
    queryFn: () => gymBrandingService.get(),
  })

  useEffect(() => {
    if (data?.gymName) setGymName(data.gymName)
  }, [data])

  const displayName = gymName || data?.gymName || ''

  const saveMutation = useMutation({
    mutationFn: () =>
      gymBrandingService.update({
        gymName: displayName.trim(),
        gymLogoUrl: data?.gymLogoUrl,
        invoiceLogoUrl: data?.invoiceLogoUrl,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['gym-branding'], saved)
      setGymName(saved.gymName)
      toast.success('Invoice branding saved')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not save branding')),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => gymBrandingService.uploadInvoiceLogo(file),
    onSuccess: (saved) => {
      queryClient.setQueryData(['gym-branding'], saved)
      setGymName(saved.gymName)
      toast.success('Invoice logo uploaded')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not upload logo')),
  })

  const logoUrl = data?.invoiceLogoUrl ?? data?.gymLogoUrl ?? null

  return (
    <DashboardLayout userName={userName}>
      <PermissionGate
        permission={authService.permissionCodes.config}
        fallback={
          <div className="glass-card dashboard-card rounded-2xl p-6 text-sm text-amber-200">
            You do not have permission to configure invoice branding.
          </div>
        }
      >
        <DashboardSubpageShell
          eyebrow="Settings"
          titleBefore="Invoice "
          titleGradient="branding"
          subtitle="Gym name and logo shown on membership invoice PDFs and payment receipts."
        >
          <div className="glass-card dashboard-card max-w-3xl rounded-2xl p-6">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading branding…</p>
            ) : isError ? (
              <p className="text-sm text-rose-300">Could not load invoice branding.</p>
            ) : (
              <div className="space-y-6">
                <Input
                  label="Gym name on invoices"
                  value={gymName || data?.gymName || ''}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="Tiger Fitness"
                />

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-medium text-white">Invoice logo</p>
                  <p className="mt-1 text-xs text-slate-400">
                    PNG, JPG, or WebP. Recommended square image, at least 200×200 px.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Invoice logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-500">No logo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadMutation.mutate(file)
                          e.target.value = ''
                        }}
                      />
                      <Button
                        variant="soft"
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={uploadMutation.isPending}
                      >
                        {logoUrl ? 'Replace logo' : 'Upload logo'}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => saveMutation.mutate()}
                  isLoading={saveMutation.isPending}
                  disabled={!displayName.trim()}
                >
                  Save gym name
                </Button>
              </div>
            )}
          </div>
        </DashboardSubpageShell>
      </PermissionGate>
    </DashboardLayout>
  )
}
