import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { retailInventoryService } from '../../../services/retail.service'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import type { Product } from '../../../types/retail'

export function StockInwardModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient()
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState(String(product.purchasePrice || ''))
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => (await retailInventoryService.recordInward({
      productId: product.id,
      quantity: Number(quantity) || 0,
      unitPrice: Number(unitPrice) || 0,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail-products'] })
      toast.success('Stock added')
      onClose()
    },
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Failed to add stock')),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const q = Number(quantity)
    if (!q || q <= 0) return setError('Quantity must be > 0')
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
        <p className="text-slate-300">{product.name}</p>
        <p className="text-xs text-slate-500">SKU: {product.sku} · Current stock: {product.stockQuantity}</p>
      </div>
      {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
      <Input label="Quantity *" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      <Input label="Unit Cost (₹)" type="number" min={0} step={0.01} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
      <Input label="Reference (vendor invoice no.)" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
      <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>Add Stock</Button>
      </div>
    </form>
  )
}
