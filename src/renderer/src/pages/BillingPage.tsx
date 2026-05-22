import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Minus, Trash2, Printer, CheckCircle, ShoppingCart } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface Product { id: number; name: string; product_code: string; sale_price: number; quantity: number }
interface Customer { id: number; name: string; phone: string | null }
interface CartItem extends Product { cartQuantity: number }

export default function BillingPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('')
  const [discount, setDiscount] = useState(0)
  const [amountPaid, setAmountPaid] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [invoiceId, setInvoiceId] = useState<number | null>(null)

  useEffect(() => {
    window.api.customers.all().then(res => { if (res.success) setCustomers(res.customers) })
  }, [])

  useEffect(() => {
    if (search.length >= 2) {
      window.api.products.search(search).then(res => {
        if (res.success) setProducts(res.products.filter((p: any) => p.quantity > 0))
      })
    } else {
      setProducts([])
    }
  }, [search])

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.sale_price * item.cartQuantity), 0), [cart])
  const total = Math.max(0, subtotal - discount)

  useEffect(() => {
    if (amountPaid === '') setAmountPaid(total)
  }, [total, amountPaid])

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        if (existing.cartQuantity >= product.quantity) return prev
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item)
      }
      return [...prev, { ...product, cartQuantity: 1 }]
    })
    setSearch('')
    setProducts([])
  }

  function updateQuantity(id: number, delta: number) {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, Math.min(item.quantity, item.cartQuantity + delta))
        return { ...item, cartQuantity: newQ }
      }
      return item
    }))
  }

  function removeFromCart(id: number) {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  async function handleCheckout() {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
      const data = {
        customer_id: selectedCustomerId || undefined,
        customer_name: selectedCustomer?.name,
        discount,
        amount_paid: amountPaid === '' ? total : Math.min(Number(amountPaid), total),
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.cartQuantity,
          unit_price: item.sale_price
        }))
      }
      const res = await window.api.invoices.create(data)
      if (res.success) {
        setInvoiceId(res.invoice.id)
      } else {
        alert(res.error || 'Failed to create invoice')
      }
    } catch (err: any) {
      alert(err.message)
    }
    setLoading(false)
  }

  function resetPos() {
    setCart([])
    setSelectedCustomerId('')
    setDiscount(0)
    setAmountPaid('')
    setPaymentMethod('cash')
    setInvoiceId(null)
  }

  function handlePrint() {
    window.print()
  }

  if (invoiceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-fade-in space-y-6">
        <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Invoice Created Successfully!</h2>
        <div className="flex gap-4">
          <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary-hover text-white rounded-xl transition-colors font-medium">
            <Printer className="w-5 h-5" /> Print Invoice
          </button>
          <button onClick={resetPos} className="px-6 py-3 bg-input hover:bg-card-hover text-foreground rounded-xl transition-colors font-medium border border-border">
            New Sale
          </button>
        </div>

        {/* Hidden Printable Area */}
        <div className="print-only print-invoice">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">Motor Bike Workshop</h1>
            <p>Main Road, Your City | Ph: 0300-0000000</p>
            <h2 className="text-lg font-semibold mt-4">SALE RECEIPT</h2>
            <p>Invoice #: INV-{invoiceId}</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>
          <table className="mb-4">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.cartQuantity}</td>
                  <td>{item.sale_price}</td>
                  <td>{item.cartQuantity * item.sale_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right space-y-1">
            <p>Subtotal: {formatCurrency(subtotal)}</p>
            {discount > 0 && <p>Discount: {formatCurrency(discount)}</p>}
            <p className="font-bold text-lg border-t border-black pt-1">Total: {formatCurrency(total)}</p>
            <p>Paid: {formatCurrency(Number(amountPaid))}</p>
          </div>
          <div className="text-center mt-8 pt-4 border-t border-black">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-6 animate-fade-in no-print">
      {/* Left side: Products search & list */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Point of Sale</h1>
          <p className="text-sm text-muted mt-1">Search and add products to cart</p>
        </div>

        <div className="relative z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search by name or code (min 2 chars)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-input border border-input-border rounded-xl text-foreground text-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-lg shadow-black/20"
              autoFocus
            />
          </div>

          {products.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full text-left px-5 py-3 border-b border-border hover:bg-card-hover transition-colors flex justify-between items-center group"
                >
                  <div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                    <p className="text-xs text-muted font-mono">{p.product_code} • {p.quantity} in stock</p>
                  </div>
                  <p className="font-semibold text-foreground">{formatCurrency(p.sale_price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick info or empty state */}
        <div className="flex-1 bg-card/30 border border-border rounded-xl flex items-center justify-center border-dashed">
          <p className="text-muted text-center max-w-sm">
            Search for products above and click to add them to the cart. Barcode scanner input works here too.
          </p>
        </div>
      </div>

      {/* Right side: Cart & Checkout */}
      <div className="w-[400px] bg-card border border-border rounded-xl flex flex-col shrink-0 overflow-hidden shadow-xl shadow-black/10">
        <div className="p-4 border-b border-border bg-card-hover/50 flex justify-between items-center">
          <h2 className="font-bold text-foreground">Current Sale</h2>
          <span className="bg-primary/20 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
            {cart.length} items
          </span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted opacity-50">
              <ShoppingCart className="w-12 h-12 mb-2" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 bg-input/50 p-3 rounded-lg border border-border/50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted">{formatCurrency(item.sale_price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-card hover:bg-card-hover rounded text-muted border border-border"><Minus className="w-3 h-3" /></button>
                  <span className="w-6 text-center text-sm font-medium">{item.cartQuantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} disabled={item.cartQuantity >= item.quantity} className="p-1 bg-card hover:bg-card-hover rounded text-muted border border-border disabled:opacity-50"><Plus className="w-3 h-3" /></button>
                </div>
                <div className="text-right min-w-[70px]">
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(item.sale_price * item.cartQuantity)}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-xs text-danger hover:underline mt-1">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout panel */}
        <div className="p-4 border-t border-border bg-card-hover/30 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">Customer (Optional)</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Walk-in Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">Discount</label>
              <input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="text-foreground font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Discount</span>
                <span className="text-danger font-medium">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary glow-text">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">Amount Paid (Cash Tendered)</label>
            <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-input border border-primary/50 rounded-lg text-lg font-medium text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center" />
            {Number(amountPaid) > total && (
              <div className="mt-3 p-3 bg-success-bg border border-success/20 rounded-lg flex justify-between items-center animate-fade-in">
                <span className="text-sm font-bold text-success">Change to Return:</span>
                <span className="text-xl font-bold text-success">{formatCurrency(Number(amountPaid) - total)}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-background font-bold text-lg rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.98] glow-amber"
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}
