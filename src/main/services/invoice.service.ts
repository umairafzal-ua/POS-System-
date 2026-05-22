import { getDatabase } from '../database/connection'
import { updateStock } from './product.service'

export interface Invoice {
  id: number
  invoice_number: string
  customer_id: number | null
  customer_name: string | null
  subtotal: number
  discount: number
  total: number
  amount_paid: number
  payment_method: string
  status: string
  notes: string | null
  created_at: string
  items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: number
  invoice_id: number
  product_id: number | null
  product_name: string
  quantity: number
  unit_price: number
  total: number
}

export interface CreateInvoiceData {
  customer_id?: number
  customer_name?: string
  discount?: number
  amount_paid?: number
  payment_method?: string
  notes?: string
  items: {
    product_id: number
    product_name: string
    quantity: number
    unit_price: number
  }[]
}

function generateInvoiceNumber(db: any): string {
  const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get() as { value: string } | undefined
  const prefix = settingsRow?.value || 'INV'
  const today = new Date()
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

  const lastInvoice = db.prepare(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${prefix}-${dateStr}-%`) as { invoice_number: string } | undefined

  let seq = 1
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split('-')
    seq = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`
}

export function createInvoice(data: CreateInvoiceData): Invoice {
  const db = getDatabase()

  const result = db.transaction(() => {
    const invoiceNumber = generateInvoiceNumber(db)
    let subtotal = 0

    for (const item of data.items) {
      subtotal += item.quantity * item.unit_price
    }

    const discount = data.discount || 0
    const total = subtotal - discount
    const amountPaid = data.amount_paid !== undefined ? data.amount_paid : total

    const invoiceResult = db.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, customer_name, subtotal, discount, total, amount_paid, payment_method, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
    `).run(
      invoiceNumber,
      data.customer_id || null,
      data.customer_name || 'Walk-in Customer',
      subtotal,
      discount,
      total,
      amountPaid,
      data.payment_method || 'cash',
      data.notes || null
    )

    const invoiceId = invoiceResult.lastInsertRowid as number

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    for (const item of data.items) {
      const itemTotal = item.quantity * item.unit_price
      insertItem.run(invoiceId, item.product_id, item.product_name, item.quantity, item.unit_price, itemTotal)
      // Deduct stock
      updateStock(item.product_id, -item.quantity)
    }

    // Update customer due if partial payment
    if (data.customer_id && amountPaid < total) {
      const due = total - amountPaid
      db.prepare('UPDATE customers SET total_due = total_due + ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(due, data.customer_id)
    }

    return invoiceId
  })()

  return getInvoice(result as number)!
}

export function getInvoice(id: number): Invoice | null {
  const db = getDatabase()
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Invoice | undefined
  if (!invoice) return null

  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id) as InvoiceItem[]
  return invoice
}

export function getInvoices(filters: { page?: number; limit?: number; status?: string; search?: string; date_from?: string; date_to?: string } = {}): { invoices: Invoice[]; total: number } {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []

  if (filters.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters.search) {
    conditions.push('(invoice_number LIKE ? OR customer_name LIKE ?)')
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }
  if (filters.date_from) {
    conditions.push('created_at >= ?')
    params.push(filters.date_from)
  }
  if (filters.date_to) {
    conditions.push('created_at <= ?')
    params.push(filters.date_to + ' 23:59:59')
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit || 50
  const offset = ((filters.page || 1) - 1) * limit

  const total = db.prepare(`SELECT COUNT(*) as count FROM invoices ${where}`).get(...params) as { count: number }
  const invoices = db.prepare(`SELECT * FROM invoices ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Invoice[]

  return { invoices, total: total.count }
}

export function cancelInvoice(id: number): boolean {
  const db = getDatabase()

  return db.transaction(() => {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND status = "completed"').get(id) as Invoice | undefined
    if (!invoice) return false

    // Restore stock
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id) as InvoiceItem[]
    for (const item of items) {
      if (item.product_id) {
        updateStock(item.product_id, item.quantity)
      }
    }

    // Reverse customer due
    if (invoice.customer_id && invoice.amount_paid < invoice.total) {
      const due = invoice.total - invoice.amount_paid
      db.prepare('UPDATE customers SET total_due = total_due - ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(due, invoice.customer_id)
    }

    db.prepare('UPDATE invoices SET status = "cancelled" WHERE id = ?').run(id)
    return true
  })()
}

export function getTodaySales(): { total: number; count: number } {
  const db = getDatabase()
  const result = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
    FROM invoices 
    WHERE status = 'completed' AND date(created_at) = date('now', 'localtime')
  `).get() as { total: number; count: number }
  return result
}

export function getMonthlySales(): { total: number; count: number } {
  const db = getDatabase()
  const result = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
    FROM invoices 
    WHERE status = 'completed' 
    AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
  `).get() as { total: number; count: number }
  return result
}
