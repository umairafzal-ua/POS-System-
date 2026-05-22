import { useState, useEffect } from 'react'
import { Save, Database, ShieldAlert } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.api.settings.get().then(res => {
      if (res.success) setSettings(res.settings)
    })
  }, [])

  const handleChange = (key: string, value: string) => setSettings(p => ({ ...p, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const res = await window.api.settings.update(settings)
    if (res.success) {
      setSettings(res.settings)
      setMsg('Settings saved successfully.')
      setTimeout(() => setMsg(''), 3000)
    }
    setSaving(false)
  }

  const handleBackup = async () => {
    const res = await window.api.settings.backup()
    if (res.success) alert('Backup created successfully at ' + res.path)
    else if (res.error !== 'Cancelled') alert('Backup failed: ' + res.error)
  }

  const handleRestore = async () => {
    if(confirm('Warning: Restoring will overwrite all current data. Do you want to proceed?')) {
      const res = await window.api.settings.restore()
      if (res.success) alert('Database restored successfully. Please restart the application.')
      else if (res.error !== 'Cancelled') alert('Restore failed: ' + res.error)
    }
  }

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted mt-1">Configure your shop and system preferences.</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-card-hover/30">
          <h2 className="font-bold text-lg">Shop Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted">Shop Name</label><input value={settings.shop_name||''} onChange={e=>handleChange('shop_name',e.target.value)} className="w-full mt-1 px-3 py-2 bg-input rounded border border-border focus:border-primary outline-none"/></div>
            <div><label className="text-xs text-muted">Phone Number</label><input value={settings.shop_phone||''} onChange={e=>handleChange('shop_phone',e.target.value)} className="w-full mt-1 px-3 py-2 bg-input rounded border border-border focus:border-primary outline-none"/></div>
          </div>
          <div><label className="text-xs text-muted">Address</label><textarea value={settings.shop_address||''} onChange={e=>handleChange('shop_address',e.target.value)} className="w-full mt-1 px-3 py-2 bg-input rounded border border-border focus:border-primary outline-none resize-none" rows={2}/></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-card-hover/30">
          <h2 className="font-bold text-lg">Invoice Settings</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted">Currency (e.g. PKR, USD)</label><input value={settings.currency||''} onChange={e=>handleChange('currency',e.target.value)} className="w-full mt-1 px-3 py-2 bg-input rounded border border-border focus:border-primary outline-none"/></div>
            <div><label className="text-xs text-muted">Currency Symbol</label><input value={settings.currency_symbol||''} onChange={e=>handleChange('currency_symbol',e.target.value)} className="w-full mt-1 px-3 py-2 bg-input rounded border border-border focus:border-primary outline-none"/></div>
            <div><label className="text-xs text-muted">Invoice Prefix (e.g. INV)</label><input value={settings.invoice_prefix||''} onChange={e=>handleChange('invoice_prefix',e.target.value)} className="w-full mt-1 px-3 py-2 bg-input rounded border border-border focus:border-primary outline-none"/></div>
            <div><label className="text-xs text-muted">Repair Job Prefix (e.g. REP)</label><input value={settings.repair_prefix||''} onChange={e=>handleChange('repair_prefix',e.target.value)} className="w-full mt-1 px-3 py-2 bg-input rounded border border-border focus:border-primary outline-none"/></div>
          </div>
          <div><label className="text-xs text-muted">Invoice Footer Note</label><input value={settings.invoice_footer||''} onChange={e=>handleChange('invoice_footer',e.target.value)} className="w-full mt-1 px-3 py-2 bg-input rounded border border-border focus:border-primary outline-none"/></div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-background font-bold rounded-xl active:scale-[0.98] transition-all">
          <Save className="w-4 h-4"/> {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {msg && <span className="text-success text-sm">{msg}</span>}
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="font-bold text-lg mb-4 text-danger flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Data Management</h2>
        <div className="flex gap-4 bg-danger/10 p-6 rounded-xl border border-danger/20">
          <div className="flex-1">
            <h3 className="font-bold mb-1">Local Database Backup</h3>
            <p className="text-sm text-muted">Create a secure backup of all your shop data (products, invoices, customers) to a file on your computer.</p>
            <button onClick={handleBackup} className="mt-4 flex items-center gap-2 px-4 py-2 bg-input border border-border rounded-lg text-sm hover:bg-card-hover"><Database className="w-4 h-4"/> Backup Database</button>
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">Restore Data</h3>
            <p className="text-sm text-muted">Restore your system from a previously saved backup file. This will overwrite current data.</p>
            <button onClick={handleRestore} className="mt-4 flex items-center gap-2 px-4 py-2 bg-danger/20 text-danger border border-danger/30 rounded-lg text-sm hover:bg-danger hover:text-white transition-colors"><Database className="w-4 h-4"/> Restore Database</button>
          </div>
        </div>
      </div>
    </div>
  )
}
