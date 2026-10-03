import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell, DashboardTablePanel } from '../../../components/layout/DashboardSubpageShell'
import { Modal } from '../../../components/ui/Modal'
import { retailInventoryService } from '../../../services/retail.service'
import { canAccessPaymentsNav } from '../../../features/auth/navPermissions'
import { StockInwardModal } from '../components/StockInwardModal'
import type { InventoryAlert } from '../../../types/retail'

function getDashboardUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as { fullName?: string; username?: string }
    return { userName: u?.fullName?.trim() || u?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

export function InventoryAlertsPage() {
  const { userName } = getDashboardUser()
  const canAdjust = canAccessPaymentsNav()
  const [stockAlert, setStockAlert] = useState<InventoryAlert | null>(null)

  const { data: lowStock = [] } = useQuery({
    queryKey: ['retail-inventory-low-stock'],
    queryFn: async () => (await retailInventoryService.getLowStockAlerts()).data,
  })

  const { data: expiry = [] } = useQuery({
    queryKey: ['retail-inventory-expiry'],
    queryFn: async () => (await retailInventoryService.getExpiryAlerts(30)).data,
  })

  const sortedLow = useMemo(
    () =>
      [...lowStock].sort((a, b) => {
        const aOut = a.alertType === 'OutOfStock' ? 0 : 1
        const bOut = b.alertType === 'OutOfStock' ? 0 : 1
        if (aOut !== bOut) return aOut - bOut
        return a.stockQuantity - b.stockQuantity
      }),
    [lowStock],
  )

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Retail"
        titleGradient="Inventory Alerts"
        subtitle="Low stock and expiring products to action immediately. Stock in uses the existing inward ledger."
        showExport={false}
      >
        <DashboardTablePanel
          title={`Low Stock (${sortedLow.length})`}
          description="Products at or below the reorder threshold. Out of stock first."
        >
          {sortedLow.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">All products are above their thresholds.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Threshold</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLow.map((a) => (
                    <tr
                      key={a.productId}
                      data-testid="low-stock-row"
                      data-alert-type={a.alertType}
                      className="border-b border-white/5"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-300">{a.sku}</td>
                      <td className="px-4 py-2.5 text-slate-200">{a.productName}</td>
                      <td className="px-4 py-2.5 font-bold text-amber-300">{a.stockQuantity}</td>
                      <td className="px-4 py-2.5 text-slate-400">{a.lowStockThreshold}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            a.alertType === 'OutOfStock'
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {a.alertType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-2">
                          {canAdjust && (
                            <button
                              type="button"
                              onClick={() => setStockAlert(a)}
                              className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-200 hover:bg-blue-500/20"
                            >
                              Add stock
                            </button>
                          )}
                          <Link
                            to="/dashboard/retail/products"
                            className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5"
                          >
                            Open catalog
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>

        <DashboardTablePanel
          title={`Expiring / Expired (${expiry.length})`}
          description="Products expiring within 30 days or already expired."
        >
          {expiry.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No expiring products.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expiry.map((a) => (
                    <tr key={a.productId} className="border-b border-white/5">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-300">{a.sku}</td>
                      <td className="px-4 py-2.5 text-slate-200">{a.productName}</td>
                      <td className="px-4 py-2.5 text-slate-300">{a.stockQuantity}</td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : '—'}
                      </td>
                      <td
                        className={`px-4 py-2.5 font-bold ${
                          (a.daysToExpiry ?? 0) < 0 ? 'text-rose-300' : 'text-amber-300'
                        }`}
                      >
                        {a.daysToExpiry ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            a.alertType === 'Expired'
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {a.alertType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal open={!!stockAlert} onClose={() => setStockAlert(null)} title="Add Stock (Inward)">
        {stockAlert && (
          <StockInwardModal
            product={{
              id: stockAlert.productId,
              name: stockAlert.productName,
              sku: stockAlert.sku,
              stockQuantity: stockAlert.stockQuantity,
              purchasePrice: 0,
            }}
            onClose={() => setStockAlert(null)}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
}
