import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { retailProductsService } from '../../../services/retail.service'
import { supplementTrackingService } from '../services/supplementTracking.service'
import { SUPPLEMENT_TIMINGS, type CreateMemberSupplementPayload } from '../types/supplementTracking'

interface Props {
  open: boolean
  onClose: () => void
  userId: number
  memberName?: string
  onAssigned: () => void
}

export function AssignSupplementModal({ open, onClose, userId, memberName, onAssigned }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [supplementMasterId, setSupplementMasterId] = useState<number | ''>('')
  const [dosage, setDosage] = useState('')
  const [timing, setTiming] = useState('Morning')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [productId, setProductId] = useState<number | ''>('')

  const { data: masters = [] } = useQuery({
    queryKey: ['supplement-master', true],
    queryFn: async () => (await supplementTrackingService.listMaster(true)).data,
    enabled: open,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-supplements'],
    queryFn: async () => (await retailProductsService.search({ status: 'Active' })).data,
    enabled: open,
  })

  const selectedMaster = masters.find((m) => m.id === supplementMasterId)

  useEffect(() => {
    if (!selectedMaster) return
    if (!dosage && selectedMaster.defaultDosage) setDosage(selectedMaster.defaultDosage)
    if (!productId && selectedMaster.productId) setProductId(selectedMaster.productId)
  }, [selectedMaster, dosage, productId])

  const assignMutation = useMutation({
    mutationFn: (payload: CreateMemberSupplementPayload) => supplementTrackingService.assign(payload),
    onSuccess: () => {
      onAssigned()
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplementMasterId || !dosage.trim()) return
    const payload: CreateMemberSupplementPayload = {
      userId,
      supplementMasterId: Number(supplementMasterId),
      dosage: dosage.trim(),
      timing,
      startDate,
      endDate: endDate || null,
      notes: notes.trim() || null,
      productId: productId === '' ? null : Number(productId),
    }
    assignMutation.mutate(payload)
  }

  return (
    <Modal open={open} onClose={onClose} title={memberName ? `Assign supplement — ${memberName}` : 'Assign supplement'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-slate-300">
          Supplement
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
            value={supplementMasterId}
            onChange={(e) => setSupplementMasterId(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="">Select supplement…</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.category})
              </option>
            ))}
          </select>
        </label>

        <Input label="Dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 1 scoop" required />

        <label className="block text-sm text-slate-300">
          Timing
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
          >
            {SUPPLEMENT_TIMINGS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Input label="End date (optional)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <label className="block text-sm text-slate-300">
          Link retail product (optional)
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
            value={productId}
            onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">None</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-300">
          Notes / instructions
          <textarea
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Take with water after workout…"
          />
        </label>

        {assignMutation.isError && (
          <p className="text-sm text-rose-400">{getApiErrorMessage(assignMutation.error)}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning…' : 'Assign supplement'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
