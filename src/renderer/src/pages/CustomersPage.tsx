import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, History } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Customer {
  id: number; name: string; phone: string | null; address: string | null;
  bike_model: string | null; notes: string | null; total_due: number; created_at: string;
}

const emptyCustomer = { name: '', phone: '', address: '', bike_model: '', notes: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyCustomer)
  const [saving, setSaving] = useState(false)
  
  // History Modal
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    loadCustomers()
  }, [search, page])

  async function loadCustomers() {
    const res = await window.api.customers.list({ search, page, limit: 20 })
    if (res.success) {
      setCustomers(res.customers)
      setTotal(res.total)
    }
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    const res = editing ? await window.api.customers.update(editing.id, form) : await window.api.customers.create(form)
    if (res.success) {
      setShowModal(false)
      loadCustomers()
    }
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (confirm('Are you sure you want to delete this customer?')) {
      const res = await window.api.customers.delete(id)
      if (res.success) loadCustomers()
    }
  }

  async function viewHistory(customer: Customer) {
    const res = await window.api.customers.history(customer.id)
    if (res.success) {
      setHistoryData(res.history)
      setHistoryCustomer(customer)
      setShowHistory(true)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted mt-1">{total} total customers</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyCustomer); setShowModal(true) }} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background font-semibold rounded-xl">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input type="text" placeholder="Search by name, phone, or bike..." value={search} onChange={e => {setSearch(e.target.value); setPage(1)}}
          className="w-full pl-10 pr-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-card-hover/50 border-b border-border text-xs uppercase text-muted font-semibold">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Bike Model</th>
              <th className="px-4 py-3 text-right">Total Due</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-card-hover">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-sm text-muted">{c.phone || '-'}</td>
                <td className="px-4 py-3 text-sm text-muted">{c.bike_model || '-'}</td>
                <td className={`px-4 py-3 text-right font-semibold ${c.total_due > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(c.total_due)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => viewHistory(c)} className="p-1.5 rounded-md hover:bg-info/20 text-info" title="History"><History className="w-4 h-4"/></button>
                    <button onClick={() => { setEditing(c); setForm({ name: c.name, phone: c.phone||'', address: c.address||'', bike_model: c.bike_model||'', notes: c.notes||'' }); setShowModal(true) }} className="p-1.5 rounded-md hover:bg-secondary/20 text-secondary" title="Edit"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md hover:bg-danger/20 text-danger" title="Delete"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 border border-border">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit' : 'Add'} Customer</h2>
            <div className="space-y-4">
              <div><label className="text-xs text-muted">Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full mt-1 px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div><label className="text-xs text-muted">Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full mt-1 px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div><label className="text-xs text-muted">Bike Model</label><input value={form.bike_model} onChange={e=>setForm({...form,bike_model:e.target.value})} className="w-full mt-1 px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div><label className="text-xs text-muted">Address</label><textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full mt-1 px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-lg hover:bg-card-hover">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-background rounded-lg font-medium">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && historyCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl p-6 border border-border max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">{historyCustomer.name} - History</h2>
                <p className="text-sm text-danger mt-1">Total Due: {formatCurrency(historyCustomer.total_due)}</p>
              </div>
              <button onClick={()=>setShowHistory(false)} className="text-muted hover:text-foreground">Close</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {historyData.length === 0 ? <p className="text-muted text-center py-8">No history found</p> : (
                <div className="space-y-3">
                  {historyData.map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-input rounded-lg border border-border">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold mr-2 ${h.type === 'invoice' ? 'bg-success/20 text-success' : 'bg-info/20 text-info'}`}>{h.type}</span>
                        <span className="font-medium">{h.invoice_number || h.job_number}</span>
                        <p className="text-xs text-muted mt-1">{formatDate(h.created_at)} • Status: {h.status}</p>
                      </div>
                      <div className="text-right font-bold text-foreground">
                        {formatCurrency(h.total || h.total_charges)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
