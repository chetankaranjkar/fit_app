import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { memberPtPackagesService, ptPackagesService } from '../../../services/personalTraining.service'
import { usersService } from '../../../services/users.service'
import { trainersService } from '../../../services/trainers.service'
import { getApiErrorMessage } from '../../../lib/apiErrors'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return u?.fullName?.trim() || u?.username?.trim() || 'User'
  } catch {
    return 'User'
  }
}

export function PtAssignPackagePage() {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [paidAmount, setPaidAmount] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['users-list-pt'],
    queryFn: async () => (await usersService.getAll()).data,
  })
  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers-list-pt'],
    queryFn: async () => (await trainersService.getAll()).data,
  })
  const { data: packages } = useQuery({
    queryKey: ['pt-packages-assign'],
    queryFn: async () => (await ptPackagesService.search({ pageSize: 100, isActive: true })).data,
  })

  const assignMutation = useMutation({
    mutationFn: () =>
      memberPtPackagesService.assign({
        userId: Number(userId),
        trainerId: Number(trainerId),
        packageId: Number(packageId),
        paidAmount: paidAmount ? Number(paidAmount) : undefined,
      }),
    onSuccess: () => {
      toast.success('PT package assigned')
      queryClient.invalidateQueries({ queryKey: ['pt-member-packages'] })
      setPaidAmount('')
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Assign failed')),
  })

  return (
    <DashboardLayout userName={getDashboardUser()}>
      <DashboardSubpageShell eyebrow="Personal Training" titleGradient="Assign package" subtitle="Link a member to a trainer and PT package; generates a PT invoice.">
        <div className="glass-card max-w-xl space-y-4 p-6">
          <label className="block text-sm text-slate-300">
            Member
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
              <option value="">Select member</option>
              {users.map((u: { id: number; firstName: string; lastName: string }) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-300">
            Trainer
            <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
              <option value="">Select trainer</option>
              {trainers.map((t: { id: number; user?: { firstName: string; lastName: string } }) => (
                <option key={t.id} value={t.id}>{t.user ? `${t.user.firstName} ${t.user.lastName}` : `Trainer #${t.id}`}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-300">
            Package
            <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
              <option value="">Select package</option>
              {(packages?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.packageName}</option>
              ))}
            </select>
          </label>
          <Input label="Initial payment (optional)" type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          <Button
            variant="primary"
            disabled={!userId || !trainerId || !packageId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            Assign & create invoice
          </Button>
        </div>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
