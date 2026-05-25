import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { retailInventoryService } from '../../../services/retail.service'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return { userName: u?.fullName?.trim() || u?.username?.trim() || 'User' }
  } catch { return { userName: 'User' } }
}

export function InventoryAlertsPage() {
  const { userName } = getDashboardUser()

  const { data: lowStock = [] } = useQuery({
    queryKey: ['retail-inventory-low-stock'],
    queryFn: async () => (await retailInventoryService.getLowStockAlerts()).data,
  })

  const { data: expiry = [] } = useQuery({
    queryKey: ['retail-inventory-expiry'],
    queryFn: async () => (await retailInventoryService.getExpiryAlerts(30)).data,
  })

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell eyebrow="Retail" titleGradient="Inventory Alerts" subtitle="Low stock and expiring products to action immediately." showExport={false}>
        <DashboardTablePanel title={`Low Stock (${lowStock.length})`} description="Products at or below the reorder threshold.">
          {lowStock.length === 0 ? <p className="px-6 py-8 text-sm text-slate-400">All products are above their thresholds.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">SKU</th><th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Stock</th><th className="px-4 py-3">Threshold</th><th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((a) => (
                    <tr key={a.productId} className="border-b border-white/5">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-300">{a.sku}</td>
                      <td className="px-4 py-2.5 text-slate-200">{a.productName}</td>
                      <td className="px-4 py-2.5 font-bold text-amber-300">{a.stockQuantity}</td>
                      <td className="px-4 py-2.5 text-slate-400">{a.lowStockThreshold}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.alertType === 'OutOfStock' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>{a.alertType}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>

        <DashboardTablePanel title={`Expiring / Expired (${expiry.length})`} description="Products expiring within 30 days or already expired.">
          {expiry.length === 0 ? <p className="px-6 py-8 text-sm text-slate-400">No expiring products.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">SKU</th><th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Stock</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expiry.map((a) => (
                    <tr key={a.productId} className="border-b border-white/5">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-300">{a.sku}</td>
                      <td className="px-4 py-2.5 text-slate-200">{a.productName}</td>
                      <td className="px-4 py-2.5 text-slate-300">{a.stockQuantity}</td>
                      <td className="px-4 py-2.5 text-slate-300">{a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : '—'}</td>
                      <td className={`px-4 py-2.5 font-bold ${(a.daysToExpiry ?? 0) < 0 ? 'text-rose-300' : 'text-amber-300'}`}>{a.daysToExpiry ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.alertType === 'Expired' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>{a.alertType}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
