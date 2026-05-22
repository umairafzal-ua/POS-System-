import { useState, useEffect } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Printer, TrendingUp, Calendar, Save } from 'lucide-react'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('profit')
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [profitData, setProfitData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'profit') loadProfit()
  }, [activeTab, dateFrom, dateTo])

  const loadProfit = async () => {
    setLoading(true)
    const res = await window.api.reports.profit(dateFrom, dateTo)
    if (res.success) setProfitData(res.report)
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-fade-in no-print">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-input border border-border rounded-xl hover:bg-card-hover"><Printer className="w-4 h-4"/> Print</button>
      </div>

      <div className="flex gap-4 p-1 bg-input/50 border border-border rounded-xl w-fit">
        <button onClick={()=>setActiveTab('profit')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab==='profit'?'bg-card text-foreground shadow':'text-muted hover:text-foreground'}`}>Profit & Loss</button>
      </div>

      {activeTab === 'profit' && (
        <div className="space-y-6">
          <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border">
            <Calendar className="w-5 h-5 text-muted" />
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="bg-input border border-border rounded px-3 py-1.5 text-sm outline-none" />
            <span className="text-muted">to</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="bg-input border border-border rounded px-3 py-1.5 text-sm outline-none" />
          </div>

          {loading ? <p className="text-muted text-center p-12">Generating report...</p> : profitData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-xl border border-border">
                <p className="text-sm text-muted uppercase tracking-wider mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-success glow-text">{formatCurrency(profitData.total_revenue)}</p>
                <p className="text-xs text-muted mt-2">From {profitData.total_invoices} invoices</p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <p className="text-sm text-muted uppercase tracking-wider mb-2">Cost of Goods</p>
                <p className="text-3xl font-bold text-danger">{formatCurrency(profitData.total_cost)}</p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <p className="text-sm text-muted uppercase tracking-wider mb-2">Repair Income</p>
                <p className="text-3xl font-bold text-info">{formatCurrency(profitData.repair_income)}</p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-primary/50 bg-primary/5 lg:col-span-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Net Profit</p>
                    <p className="text-4xl font-bold text-foreground">{formatCurrency(profitData.net_income)}</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-primary opacity-50" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printable Report View */}
      <div className="print-only">
        <h1 className="text-2xl font-bold mb-4">Profit & Loss Report</h1>
        <p className="mb-6">Period: {dateFrom} to {dateTo}</p>
        {profitData && (
          <table className="w-full text-left border-collapse border border-gray-300">
            <tbody>
              <tr><td className="p-2 border border-gray-300">Total Revenue</td><td className="p-2 border border-gray-300 text-right">{formatCurrency(profitData.total_revenue)}</td></tr>
              <tr><td className="p-2 border border-gray-300">Cost of Goods Sold</td><td className="p-2 border border-gray-300 text-right text-red-600">-{formatCurrency(profitData.total_cost)}</td></tr>
              <tr><td className="p-2 border border-gray-300 font-bold bg-gray-100">Gross Profit</td><td className="p-2 border border-gray-300 text-right font-bold bg-gray-100">{formatCurrency(profitData.gross_profit)}</td></tr>
              <tr><td className="p-2 border border-gray-300">Repair Jobs Income</td><td className="p-2 border border-gray-300 text-right">{formatCurrency(profitData.repair_income)}</td></tr>
              <tr><td className="p-2 border border-gray-300 font-bold text-lg bg-gray-200">Net Income</td><td className="p-2 border border-gray-300 text-right font-bold text-lg bg-gray-200">{formatCurrency(profitData.net_income)}</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
