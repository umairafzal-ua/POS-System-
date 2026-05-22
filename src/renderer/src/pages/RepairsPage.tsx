import { useState, useEffect } from 'react'
import { Plus, Wrench, Search, Eye } from 'lucide-react'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'

interface RepairJob {
  id: number; job_number: string; customer_name: string; bike_model: string; 
  problem_description: string; total_charges: number; status: string; created_at: string;
}

export default function RepairsPage() {
  const [jobs, setJobs] = useState<RepairJob[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ customer_name: '', bike_model: '', registration_number: '', problem_description: '', assigned_mechanic: '', labor_charges: 0 })

  useEffect(() => { load() }, [search, statusFilter])
  
  const load = async () => {
    const res = await window.api.repairs.list({ search, status: statusFilter || undefined })
    if (res.success) setJobs(res.jobs)
  }

  const handleSave = async () => {
    if(!form.customer_name) return
    await window.api.repairs.create(form)
    setShowModal(false)
    load()
  }

  const updateStatus = async (id: number, status: string) => {
    await window.api.repairs.updateStatus(id, status)
    load()
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Repair Jobs</h1>
          <p className="text-sm text-muted">Manage workshop jobs</p>
        </div>
        <button onClick={()=>{setForm({customer_name:'',bike_model:'',registration_number:'',problem_description:'',assigned_mechanic:'',labor_charges:0});setShowModal(true)}} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background font-semibold rounded-xl">
          <Plus className="w-4 h-4"/> New Job
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" placeholder="Search jobs, customers..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-input rounded-xl border border-border focus:border-primary outline-none" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-4 py-2 bg-input border border-border rounded-xl">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono text-xs font-bold text-muted-foreground">{job.job_number}</span>
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", getStatusColor(job.status))}>
                {getStatusLabel(job.status)}
              </span>
            </div>
            <h3 className="font-bold text-lg mb-1">{job.customer_name}</h3>
            <p className="text-sm text-muted mb-4">{job.bike_model || 'Unknown Bike'}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">{job.problem_description}</p>
            
            <div className="flex justify-between items-center border-t border-border pt-4 mt-auto">
              <p className="font-bold">{formatCurrency(job.total_charges)}</p>
              <select 
                value={job.status} 
                onChange={(e) => updateStatus(job.id, e.target.value)}
                className="text-xs bg-input border border-border rounded px-2 py-1 outline-none focus:border-primary"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 border border-border">
            <h2 className="text-lg font-bold mb-4">Create Repair Job</h2>
            <div className="space-y-4">
              <div><label className="text-xs text-muted">Customer Name *</label><input value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} className="w-full px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted">Bike Model</label><input value={form.bike_model} onChange={e=>setForm({...form,bike_model:e.target.value})} className="w-full px-3 py-2 bg-input rounded-lg border border-border" /></div>
                <div><label className="text-xs text-muted">Reg Number</label><input value={form.registration_number} onChange={e=>setForm({...form,registration_number:e.target.value})} className="w-full px-3 py-2 bg-input rounded-lg border border-border" /></div>
              </div>
              <div><label className="text-xs text-muted">Problem Description</label><textarea value={form.problem_description} onChange={e=>setForm({...form,problem_description:e.target.value})} className="w-full px-3 py-2 bg-input rounded-lg border border-border resize-none" rows={3}/></div>
              <div><label className="text-xs text-muted">Labor Charges (Est.)</label><input type="number" value={form.labor_charges} onChange={e=>setForm({...form,labor_charges:Number(e.target.value)})} className="w-full px-3 py-2 bg-input rounded-lg border border-border" /></div>
              <div className="flex gap-3 justify-end pt-4 border-t border-border"><button onClick={()=>setShowModal(false)} className="px-4 py-2">Cancel</button><button onClick={handleSave} className="px-4 py-2 bg-primary text-background rounded-lg font-medium">Create Job</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
