import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { retailProductsService, retailPosService } from '../../../services/retail.service'
import { formatInr } from '../../../lib/formatInr'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import type { Product, PosOrder, PosPaymentMethod, CreatePosOrderDto } from '../../../types/retail'

interface CartLine {
  product: Product
  quantity: number
  discount: number
}

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'
const selectClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none'

const paymentMethods: PosPaymentMethod[] = ['Cash', 'Upi', 'Card', 'Online', 'Wallet', 'Other']

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const u = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: u?.fullName?.trim() || u?.username?.trim() || 'User' }
  } catch { return { userName: 'User' } }
}

export function PosPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderDiscount, setOrderDiscount] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('Cash')
  const [paymentRef, setPaymentRef] = useState('')
  const [notes, setNotes] = useState('')
  const [completedOrder, setCompletedOrder] = useState<PosOrder | null>(null)

  const { data: products = [] } = useQuery({
    queryKey: ['retail-products', search],
    queryFn: async () => (await retailProductsService.search({ search: search || undefined, status: 'Active' })).data,
  })

  const totals = useMemo(() => {
    let subtotal = 0
    let tax = 0
    for (const line of cart) {
      const lineSub = Math.max(0, line.product.sellingPrice * line.quantity - line.discount)
      const lineTax = lineSub * (line.product.gstPercent / 100)
      subtotal += lineSub
      tax += lineTax
    }
    const orderDisc = Number(orderDiscount) || 0
    const finalAmount = Math.max(0, subtotal + tax - orderDisc)
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      orderDiscount: orderDisc,
      finalAmount: Math.round(finalAmount * 100) / 100,
    }
  }, [cart, orderDiscount])

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return toast.error('Out of stock')
    setCart((c) => {
      const idx = c.findIndex((l) => l.product.id === product.id)
      if (idx >= 0) {
        if (c[idx].quantity >= product.stockQuantity) {
          toast.error(`Max stock: ${product.stockQuantity}`)
          return c
        }
        const next = [...c]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
        return next
      }
      return [...c, { product, quantity: 1, discount: 0 }]
    })
  }

  const updateQty = (productId: number, qty: number) => {
    setCart((c) => c.map((l) => l.product.id === productId ? { ...l, quantity: Math.max(1, Math.min(qty, l.product.stockQuantity)) } : l))
  }

  const updateDiscount = (productId: number, disc: number) => {
    setCart((c) => c.map((l) => l.product.id === productId ? { ...l, discount: Math.max(0, disc) } : l))
  }

  const removeLine = (productId: number) => setCart((c) => c.filter((l) => l.product.id !== productId))

  const clearCart = () => {
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setOrderDiscount('')
    setCouponCode('')
    setPaymentRef('')
    setNotes('')
  }

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const dto: CreatePosOrderDto = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        discountAmount: Number(orderDiscount) || 0,
        couponCode: couponCode.trim() || undefined,
        paymentMethod,
        paymentReference: paymentRef.trim() || undefined,
        notes: notes.trim() || undefined,
        items: cart.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitPrice: l.product.sellingPrice,
          discountAmount: l.discount,
        })),
      }
      const { data } = await retailPosService.createOrder(dto)
      return data
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['retail-products'] })
      queryClient.invalidateQueries({ queryKey: ['retail-pos-dashboard'] })
      toast.success(`Order ${order.orderNumber} created`)
      setCompletedOrder(order)
      clearCart()
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Checkout failed')),
  })

  return (
    <DashboardLayout userName={userName}>
      <div className="grid h-[calc(100vh-80px)] grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_440px]">
        {/* Product Search & Grid */}
        <section className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <input type="text" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Scan barcode or search product/SKU…"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {products.length === 0 && <p className="col-span-full py-8 text-center text-sm text-slate-400">No products.</p>}
            {products.map((p) => (
              <button key={p.id} type="button" onClick={() => addToCart(p)}
                disabled={p.stockQuantity <= 0}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-blue-400/40 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40">
                <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                <p className="text-[11px] text-slate-500">{p.brand ?? '—'} · {p.sku}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-300">{formatInr(p.sellingPrice)}</span>
                  <span className={`text-[10px] font-medium ${p.isLowStock ? 'text-amber-300' : 'text-slate-400'}`}>
                    {p.stockQuantity} {p.unit ?? 'units'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Cart */}
        <aside className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-300">
            🛒 Cart ({cart.length})
            {cart.length > 0 && (
              <button type="button" onClick={clearCart} className="ml-auto text-xs font-normal text-rose-300 hover:underline">Clear all</button>
            )}
          </h2>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Cart is empty. Click a product to add.</p>
            ) : (
              <ul className="space-y-2">
                {cart.map((line) => (
                  <li key={line.product.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{line.product.name}</p>
                        <p className="text-[11px] text-slate-500">{line.product.sku} · {formatInr(line.product.sellingPrice)} · {line.product.gstPercent}% GST</p>
                      </div>
                      <button type="button" onClick={() => removeLine(line.product.id)} className="text-xs text-rose-400 hover:text-rose-300">✕</button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-white/10 bg-white/5">
                        <button type="button" onClick={() => updateQty(line.product.id, line.quantity - 1)} className="px-2 py-1 text-slate-400 hover:text-white">−</button>
                        <input type="number" min={1} max={line.product.stockQuantity} value={line.quantity}
                          onChange={(e) => updateQty(line.product.id, Number(e.target.value) || 1)}
                          className="w-12 bg-transparent py-1 text-center text-sm text-white focus:outline-none" />
                        <button type="button" onClick={() => updateQty(line.product.id, line.quantity + 1)} className="px-2 py-1 text-slate-400 hover:text-white">+</button>
                      </div>
                      <input type="number" min={0} step={1} value={line.discount || ''}
                        placeholder="Disc ₹"
                        onChange={(e) => updateDiscount(line.product.id, Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100" />
                      <span className="ml-auto text-sm font-semibold text-emerald-300">
                        {formatInr(Math.max(0, line.product.sellingPrice * line.quantity - line.discount) * (1 + line.product.gstPercent / 100))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Customer & Payment */}
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Input label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" />
              <Input label="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Order discount (₹)" type="number" min={0} value={orderDiscount} onChange={(e) => setOrderDiscount(e.target.value)} />
              <Input label="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Optional" />
            </div>
            <div>
              <label className={labelClass}>Payment method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PosPaymentMethod)} className={selectClass}>
                {paymentMethods.map((m) => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
              </select>
            </div>
            <Input label="Payment reference" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Txn id, optional" />
          </div>

          {/* Totals */}
          <div className="mt-3 space-y-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm">
            <div className="flex justify-between text-slate-300"><span>Subtotal</span><span>{formatInr(totals.subtotal)}</span></div>
            <div className="flex justify-between text-slate-300"><span>GST</span><span>{formatInr(totals.tax)}</span></div>
            {totals.orderDiscount > 0 && <div className="flex justify-between text-emerald-300"><span>Discount</span><span>−{formatInr(totals.orderDiscount)}</span></div>}
            <div className="mt-1 flex justify-between border-t border-white/10 pt-1 text-base font-bold">
              <span className="text-white">Total</span><span className="text-emerald-300">{formatInr(totals.finalAmount)}</span>
            </div>
          </div>

          <Button type="button" className="mt-3 w-full" disabled={cart.length === 0 || checkoutMutation.isPending}
            onClick={() => checkoutMutation.mutate()}>
            {checkoutMutation.isPending ? 'Processing…' : `💳 Checkout ${formatInr(totals.finalAmount)}`}
          </Button>
        </aside>
      </div>

      {/* Order Receipt Modal */}
      <Modal open={!!completedOrder} onClose={() => setCompletedOrder(null)} title={`Receipt: ${completedOrder?.orderNumber ?? ''}`} size="wide" scrollable>
        {completedOrder && <OrderReceipt order={completedOrder} onClose={() => setCompletedOrder(null)} />}
      </Modal>
    </DashboardLayout>
  )
}

function OrderReceipt({ order, onClose }: { order: PosOrder; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
        ✓ Sale completed · {new Date(order.orderDate).toLocaleString()}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs text-slate-500">Customer</p><p className="text-white">{order.customerName ?? 'Walk-in'}</p></div>
        <div><p className="text-xs text-slate-500">Payment</p><p className="text-white">{order.paymentMethod}</p></div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-white/10 text-xs uppercase text-slate-400">
          <th className="px-2 py-2 text-left">Item</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th>
        </tr></thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-white/5">
              <td className="px-2 py-2 text-slate-200">{it.productName}</td>
              <td className="text-center text-slate-300">{it.quantity}</td>
              <td className="text-right text-slate-300">{formatInr(it.unitPrice)}</td>
              <td className="text-right font-medium text-white">{formatInr(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
        <div className="flex justify-between text-slate-300"><span>Subtotal</span><span>{formatInr(order.subtotal)}</span></div>
        <div className="flex justify-between text-slate-300"><span>GST</span><span>{formatInr(order.taxAmount)}</span></div>
        {order.discountAmount > 0 && <div className="flex justify-between text-emerald-300"><span>Discount</span><span>−{formatInr(order.discountAmount)}</span></div>}
        {order.couponDiscountAmount > 0 && <div className="flex justify-between text-emerald-300"><span>Coupon ({order.couponCode})</span><span>−{formatInr(order.couponDiscountAmount)}</span></div>}
        <div className="flex justify-between border-t border-white/10 pt-1 text-base font-bold text-white"><span>Total</span><span className="text-emerald-300">{formatInr(order.totalAmount)}</span></div>
      </div>
      <div className="flex justify-end gap-2"><Button onClick={onClose}>Done</Button></div>
    </div>
  )
}
