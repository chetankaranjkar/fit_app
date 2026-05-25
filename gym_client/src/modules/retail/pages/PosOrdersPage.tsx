import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { MetricCard } from '../../../components/dashboard/MetricCard'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { retailPosService } from '../../../services/retail.service'
import { formatInr } from '../../../lib/formatInr'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import type { PosOrder } from '../../../types/retail'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return { userName: u?.fullName?.trim() || u?.username?.trim() || 'User' }
  } catch { return { userName: 'User' } }
}

export function PosOrdersPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [viewing, setViewing] = useState<PosOrder | null>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['retail-pos-orders', from, to],
    queryFn: async () => (await retailPosService.getOrders({ from, to })).data,
  })

  const { data: dashboard } = useQuery({
    queryKey: ['retail-pos-dashboard'],
    queryFn: async () => (await retailPosService.dashboard()).data,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => retailPosService.cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-pos-orders'] })
      queryClient.invalidateQueries({ queryKey: ['retail-pos-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['retail-products'] })
      toast.success('Order cancelled, stock restored')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to cancel')),
  })

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell eyebrow="Retail" titleGradient="POS Orders" subtitle="Sales history and order details." showExport={false}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard title="Today Sales" value={dashboard ? formatInr(dashboard.todaySales) : '—'} gradient="from-emerald-400 to-teal-500" caption={`${dashboard?.todayOrders ?? 0} orders`} />
          <MetricCard title="Month Sales" value={dashboard ? formatInr(dashboard.monthSales) : '—'} gradient="from-blue-500 to-indigo-500" caption={`${dashboard?.monthOrders ?? 0} orders`} />
          <MetricCard title="Low Stock" value={dashboard?.lowStockCount ?? 0} gradient="from-amber-400 to-orange-500" caption="Need reorder" />
          <MetricCard title="Expiring Soon" value={dashboard?.expiringSoonCount ?? 0} gradient="from-rose-400 to-pink-500" caption="Within 30 days" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" />
        </div>

        <DashboardTablePanel title="Orders" description="POS sales transactions.">
          {isLoading ? <p className="px-6 py-8 text-sm text-slate-400">Loading…</p>
          : orders.length === 0 ? <p className="px-6 py-8 text-sm text-slate-400">No orders in this range.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Order #</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-300">{o.orderNumber}</td>
                      <td className="px-4 py-2.5 text-slate-300">{new Date(o.orderDate).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-slate-200">{o.customerName ?? 'Walk-in'}</td>
                      <td className="px-4 py-2.5 text-slate-400">{o.items.length}</td>
                      <td className="px-4 py-2.5 font-bold text-white">{formatInr(o.totalAmount)}</td>
                      <td className="px-4 py-2.5"><span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">{o.paymentMethod}</span></td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          o.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-300' :
                          o.status === 'Cancelled' ? 'bg-rose-500/15 text-rose-300' :
                          'bg-slate-500/15 text-slate-300'
                        }`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setViewing(o)} className="text-xs text-blue-300 hover:underline">View</button>
                          {o.status === 'Completed' && (
                            <button type="button" onClick={() => { if (window.confirm('Cancel this order? Stock will be restored.')) cancelMutation.mutate(o.id) }} className="text-xs text-rose-300 hover:underline">Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Order ${viewing.orderNumber}` : 'Order'} size="wide" scrollable>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-slate-500">Date</p><p className="text-white">{new Date(viewing.orderDate).toLocaleString()}</p></div>
              <div><p className="text-xs text-slate-500">Customer</p><p className="text-white">{viewing.customerName ?? 'Walk-in'}</p></div>
              <div><p className="text-xs text-slate-500">Payment</p><p className="text-white">{viewing.paymentMethod}</p></div>
              <div><p className="text-xs text-slate-500">Status</p><p className="text-white">{viewing.status}</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-xs uppercase text-slate-400">
                <th className="px-2 py-2 text-left">Item</th><th>Qty</th><th>Price</th><th>GST</th><th className="text-right">Total</th>
              </tr></thead>
              <tbody>
                {viewing.items.map((it) => (
                  <tr key={it.id} className="border-b border-white/5">
                    <td className="px-2 py-2 text-slate-200">{it.productName}</td>
                    <td className="text-center text-slate-300">{it.quantity}</td>
                    <td className="text-center text-slate-300">{formatInr(it.unitPrice)}</td>
                    <td className="text-center text-slate-400">{it.gstPercent}%</td>
                    <td className="text-right font-medium text-white">{formatInr(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div className="flex justify-between text-slate-300"><span>Subtotal</span><span>{formatInr(viewing.subtotal)}</span></div>
              <div className="flex justify-between text-slate-300"><span>GST</span><span>{formatInr(viewing.taxAmount)}</span></div>
              {viewing.discountAmount > 0 && <div className="flex justify-between text-emerald-300"><span>Discount</span><span>−{formatInr(viewing.discountAmount)}</span></div>}
              {viewing.couponDiscountAmount > 0 && <div className="flex justify-between text-emerald-300"><span>Coupon ({viewing.couponCode})</span><span>−{formatInr(viewing.couponDiscountAmount)}</span></div>}
              <div className="flex justify-between border-t border-white/10 pt-1 text-base font-bold text-white"><span>Total</span><span className="text-emerald-300">{formatInr(viewing.totalAmount)}</span></div>
            </div>
            <div className="flex justify-end"><Button onClick={() => setViewing(null)}>Close</Button></div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
