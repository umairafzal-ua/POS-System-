import { useEffect, useState } from 'react'
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Wrench, FileText } from 'lucide-react'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

interface DashboardStats {
  totalProducts: number
  todaySales: { total: number; count: number }
  monthlySales: { total: number; count: number }
  lowStockProducts: any[]
  recentInvoices: any[]
  repairSummary: { pending: number; in_progress: number; completed: number; delivered: number }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [totalRes, todayRes, monthlyRes, lowStockRes, invoicesRes, repairRes] = await Promise.all([
        window.api.products.totalCount(),
        window.api.invoices.todaySales(),
        window.api.invoices.monthlySales(),
        window.api.products.lowStock(),
        window.api.invoices.list({ limit: 5 }),
        window.api.repairs.summary()
      ])

      setStats({
        totalProducts: totalRes.count || 0,
        todaySales: { total: todayRes.total || 0, count: todayRes.count || 0 },
        monthlySales: { total: monthlyRes.total || 0, count: monthlyRes.count || 0 },
        lowStockProducts: lowStockRes.products || [],
        recentInvoices: invoicesRes.invoices || [],
        repairSummary: repairRes.summary || { pending: 0, in_progress: 0, completed: 0, delivered: 0 }
      })
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { label: 'Total Products', value: stats.totalProducts.toString(), icon: Package, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Today\'s Sales', value: formatCurrency(stats.todaySales.total), sub: `${stats.todaySales.count} invoices`, icon: ShoppingCart, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Monthly Sales', value: formatCurrency(stats.monthlySales.total), sub: `${stats.monthlySales.count} invoices`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Low Stock Items', value: stats.lowStockProducts.length.toString(), icon: AlertTriangle, color: stats.lowStockProducts.length > 0 ? 'text-danger' : 'text-success', bg: stats.lowStockProducts.length > 0 ? 'bg-danger/10' : 'bg-success/10' },
    { label: 'Active Repairs', value: (stats.repairSummary.pending + stats.repairSummary.in_progress).toString(), sub: `${stats.repairSummary.pending} pending`, icon: Wrench, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Completed Jobs', value: (stats.repairSummary.completed + stats.repairSummary.delivered).toString(), icon: FileText, color: 'text-accent', bg: 'bg-accent/10' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Welcome back! Here's your shop overview.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border border-card-border rounded-xl p-5 hover:bg-card-hover hover:border-primary/20 transition-all duration-300 group cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-foreground mt-2">{card.value}</p>
                {card.sub && <p className="text-xs text-muted mt-1">{card.sub}</p>}
              </div>
              <div className={`${card.bg} p-2.5 rounded-lg group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Recent Invoices
          </h2>
          {stats.recentInvoices.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">No invoices yet</p>
          ) : (
            <div className="space-y-2">
              {stats.recentInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-card-hover transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                    <p className="text-xs text-muted">{inv.customer_name || 'Walk-in'} · {formatDate(inv.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(inv.total)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inv.status === 'completed' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            Low Stock Alerts
          </h2>
          {stats.lowStockProducts.length === 0 ? (
            <p className="text-sm text-success py-6 text-center">All stock levels are healthy 👍</p>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {stats.lowStockProducts.slice(0, 10).map((prod: any) => (
                <div key={prod.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-card-hover transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{prod.name}</p>
                    <p className="text-xs text-muted">{prod.product_code} · {prod.category_name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${prod.quantity === 0 ? 'text-danger' : 'text-warning'}`}>
                      {prod.quantity} left
                    </p>
                    <p className="text-[10px] text-muted">min: {prod.low_stock_threshold}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Repair Jobs Summary */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-info" />
          Repair Jobs Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending', count: stats.repairSummary.pending, color: 'text-warning', bg: 'bg-warning-bg' },
            { label: 'In Progress', count: stats.repairSummary.in_progress, color: 'text-info', bg: 'bg-info-bg' },
            { label: 'Completed', count: stats.repairSummary.completed, color: 'text-success', bg: 'bg-success-bg' },
            { label: 'Delivered', count: stats.repairSummary.delivered, color: 'text-primary', bg: 'bg-primary-bg' },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} rounded-lg p-4 text-center`}>
              <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-xs text-muted mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
