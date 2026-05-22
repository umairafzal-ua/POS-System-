import { getDatabase } from '../database/connection'

export interface Customer {
  id: number
  name: string
  phone: string | null
  address: string | null
  bike_model: string | null
  notes: string | null
  total_due: number
  created_at: string
  updated_at: string
}

export function getCustomers(filters: { search?: string; page?: number; limit?: number } = {}): { customers: Customer[]; total: number } {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []

  if (filters.search) {
    conditions.push('(name LIKE ? OR phone LIKE ? OR bike_model LIKE ?)')
    const s = `%${filters.search}%`
    params.push(s, s, s)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit || 50
  const offset = ((filters.page || 1) - 1) * limit

  const total = db.prepare(`SELECT COUNT(*) as count FROM customers ${where}`).get(...params) as { count: number }
  const customers = db.prepare(`SELECT * FROM customers ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Customer[]

  return { customers, total: total.count }
}

export function getCustomer(id: number): Customer | null {
  const db = getDatabase()
  return (db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer) || null
}

export function createCustomer(data: Omit<Customer, 'id' | 'total_due' | 'created_at' | 'updated_at'>): Customer {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO customers (name, phone, address, bike_model, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(data.name, data.phone, data.address, data.bike_model, data.notes)
  return getCustomer(result.lastInsertRowid as number)!
}

export function updateCustomer(id: number, data: Partial<Customer>): Customer {
  const db = getDatabase()
  const fields: string[] = []
  const params: any[] = []

  for (const field of ['name', 'phone', 'address', 'bike_model', 'notes']) {
    if (field in data) {
      fields.push(`${field} = ?`)
      params.push((data as any)[field])
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = datetime(\'now\', \'localtime\')')
    params.push(id)
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  }
  return getCustomer(id)!
}

export function deleteCustomer(id: number): boolean {
  const db = getDatabase()
  return db.prepare('DELETE FROM customers WHERE id = ?').run(id).changes > 0
}

export function getCustomerHistory(customerId: number): any[] {
  const db = getDatabase()
  const invoices = db.prepare(`
    SELECT id, invoice_number, total, amount_paid, status, created_at 
    FROM invoices WHERE customer_id = ? ORDER BY id DESC
  `).all(customerId)

  const repairs = db.prepare(`
    SELECT id, job_number, total_charges, status, created_at 
    FROM repair_jobs WHERE customer_id = ? ORDER BY id DESC
  `).all(customerId)

  return [...invoices.map((i: any) => ({ ...i, type: 'invoice' })), ...repairs.map((r: any) => ({ ...r, type: 'repair' }))].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function getAllCustomers(): Customer[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM customers ORDER BY name ASC').all() as Customer[]
}
