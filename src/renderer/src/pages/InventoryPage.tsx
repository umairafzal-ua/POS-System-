import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, Package } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface Product {
  id: number; product_code: string; name: string; category_id: number | null; category_name: string;
  brand: string; quantity: number; cost_price: number; sale_price: number; low_stock_threshold: number;
  supplier_id: number | null; supplier_name: string; description: string; created_at: string;
}

interface Category { id: number; name: string; product_count?: number }
interface Supplier { id: number; name: string }

const emptyProduct = {
  product_code: '', name: '', category_id: null as number | null, brand: '',
  quantity: 0, cost_price: 0, sale_price: 0, low_stock_threshold: 5,
  supplier_id: null as number | null, description: ''
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const loadProducts = useCallback(async () => {
    const res = await window.api.products.list({
      search: search || undefined,
      category_id: categoryFilter || undefined,
      page,
      limit: 50
    })
    if (res.success) {
      setProducts(res.products)
      setTotal(res.total)
    }
  }, [search, categoryFilter, page])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    Promise.all([
      window.api.categories.list(),
      window.api.suppliers.all()
    ]).then(([catRes, supRes]) => {
      if (catRes.success) setCategories(catRes.categories)
      if (supRes.success) setSuppliers(supRes.suppliers)
    })
  }, [])

  function openAddModal() {
    setEditingProduct(null)
    setForm(emptyProduct)
    setError('')
    setShowModal(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setForm({
      product_code: product.product_code,
      name: product.name,
      category_id: product.category_id,
      brand: product.brand || '',
      quantity: product.quantity,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      low_stock_threshold: product.low_stock_threshold,
      supplier_id: product.supplier_id,
      description: product.description || ''
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.product_code || !form.name) {
      setError('Product code and name are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      let res
      if (editingProduct) {
        res = await window.api.products.update(editingProduct.id, form)
      } else {
        res = await window.api.products.create(form)
      }
      if (res.success) {
        setShowModal(false)
        loadProducts()
      } else {
        setError(res.error || 'Failed to save')
      }
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleDelete(id: number) {
    const res = await window.api.products.delete(id)
    if (res.success) {
      setDeleteConfirm(null)
      loadProducts()
    }
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted mt-1">{total} products total</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-background font-semibold rounded-xl transition-all duration-200 text-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search products, codes, brands..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
          className="px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus min-w-[180px]"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Product Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Brand</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Sale Price</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-muted">{p.product_code}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    {p.supplier_name && <p className="text-[11px] text-muted">{p.supplier_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{p.category_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-muted">{p.brand || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      'text-sm font-semibold inline-flex items-center gap-1',
                      p.quantity === 0 ? 'text-danger' : p.quantity <= p.low_stock_threshold ? 'text-warning' : 'text-success'
                    )}>
                      {p.quantity <= p.low_stock_threshold && p.quantity > 0 && <AlertTriangle className="w-3 h-3" />}
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-muted">{formatCurrency(p.cost_price)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">{formatCurrency(p.sale_price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEditModal(p)} className="p-2 rounded-lg hover:bg-secondary/10 text-muted hover:text-secondary transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(p.id)} className="p-2 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Package className="w-10 h-10 text-muted/30 mx-auto mb-2" />
                    <p className="text-sm text-muted">No products found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs bg-input rounded-lg text-muted hover:text-foreground disabled:opacity-30 transition-colors">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs bg-input rounded-lg text-muted hover:text-foreground disabled:opacity-30 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fade-in">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-card-hover text-muted hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Product Code *</label>
                  <input value={form.product_code} onChange={e => setForm({ ...form, product_code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all"
                    placeholder="e.g. ENG-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Product Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all"
                    placeholder="e.g. Piston Kit 70cc" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Category</label>
                  <select value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Brand</label>
                  <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all"
                    placeholder="e.g. Honda" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Quantity</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Cost Price</label>
                  <input type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Sale Price</label>
                  <input type="number" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Low Stock Threshold</label>
                  <input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Supplier</label>
                  <select value={form.supplier_id || ''} onChange={e => setForm({ ...form, supplier_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus">
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input border border-input-border rounded-xl text-foreground text-sm focus:outline-none focus:border-input-focus focus:ring-1 focus:ring-ring transition-all resize-none" />
              </div>

              {error && <div className="px-4 py-2 bg-danger-bg border border-danger/20 rounded-lg text-danger text-sm">{error}</div>}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm text-muted hover:text-foreground transition-colors rounded-xl hover:bg-card-hover">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-background font-semibold rounded-xl transition-all duration-200 text-sm disabled:opacity-50 active:scale-[0.98]">
                {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fade-in">
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm mx-4 animate-slide-up">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Product</h3>
            <p className="text-sm text-muted mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors rounded-xl">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-danger hover:bg-danger/80 text-white font-medium rounded-xl text-sm transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
