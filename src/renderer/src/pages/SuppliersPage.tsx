import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'

interface Supplier {
  id: number; name: string; phone: string | null; company: string | null; product_count: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', company: '' })
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => { load() }, [])
  const load = async () => { const r = await window.api.suppliers.list(); if(r.success) setSuppliers(r.suppliers) }

  const handleSave = async () => {
    if(!form.name) return
    if(editingId) await window.api.suppliers.update(editingId, form)
    else await window.api.suppliers.create(form)
    setShowModal(false)
    load()
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <button onClick={()=>{setForm({name:'',phone:'',company:''});setEditingId(null);setShowModal(true)}} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background font-semibold rounded-xl"><Plus className="w-4 h-4"/> Add Supplier</button>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-card-hover/50 border-b border-border text-xs uppercase text-muted">
            <tr><th className="p-4">Name</th><th className="p-4">Company</th><th className="p-4">Phone</th><th className="p-4 text-center">Products</th><th className="p-4 text-center">Actions</th></tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-card-hover">
                <td className="p-4 font-medium">{s.name}</td>
                <td className="p-4 text-muted">{s.company || '-'}</td>
                <td className="p-4 text-muted">{s.phone || '-'}</td>
                <td className="p-4 text-center"><span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-bold">{s.product_count || 0}</span></td>
                <td className="p-4 text-center">
                  <button onClick={()=>{setForm({name:s.name,phone:s.phone||'',company:s.company||''});setEditingId(s.id);setShowModal(true)}} className="p-1.5 text-secondary hover:bg-secondary/20 rounded mr-2"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={async ()=>{if(confirm('Delete?')){await window.api.suppliers.delete(s.id);load()}}} className="p-1.5 text-danger hover:bg-danger/20 rounded"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl p-6 border border-border">
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit' : 'Add'} Supplier</h2>
            <div className="space-y-4">
              <div><label className="text-xs text-muted">Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div><label className="text-xs text-muted">Company</label><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} className="w-full px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div><label className="text-xs text-muted">Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div className="flex gap-3 justify-end pt-4 border-t border-border"><button onClick={()=>setShowModal(false)} className="px-4 py-2">Cancel</button><button onClick={handleSave} className="px-4 py-2 bg-primary text-background rounded-lg font-medium">Save</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
