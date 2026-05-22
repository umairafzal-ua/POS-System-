import { getDatabase } from '../database/connection'

export interface Supplier {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  company: string | null
  notes: string | null
  created_at: string
  updated_at: string
  product_count?: number
}

export function getSuppliers(filters: { search?: string; page?: number; limit?: number } = {}): { suppliers: Supplier[]; total: number } {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []

  if (filters.search) {
    conditions.push('(s.name LIKE ? OR s.company LIKE ? OR s.phone LIKE ?)')
    const t = `%${filters.search}%`
    params.push(t, t, t)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit || 50
  const offset = ((filters.page || 1) - 1) * limit

  const total = db.prepare(`SELECT COUNT(*) as count FROM suppliers s ${where}`).get(...params) as { count: number }
  const suppliers = db.prepare(`
    SELECT s.*, COUNT(p.id) as product_count 
    FROM suppliers s 
    LEFT JOIN products p ON p.supplier_id = s.id 
    ${where} 
    GROUP BY s.id 
    ORDER BY s.name ASC 
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Supplier[]

  return { suppliers, total: total.count }
}

export function getSupplier(id: number): Supplier | null {
  const db = getDatabase()
  return (db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier) || null
}

export function createSupplier(data: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'product_count'>): Supplier {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO suppliers (name, phone, email, address, company, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(data.name, data.phone, data.email, data.address, data.company, data.notes)
  return getSupplier(result.lastInsertRowid as number)!
}

export function updateSupplier(id: number, data: Partial<Supplier>): Supplier {
  const db = getDatabase()
  const fields: string[] = []
  const params: any[] = []

  for (const field of ['name', 'phone', 'email', 'address', 'company', 'notes']) {
    if (field in data) {
      fields.push(`${field} = ?`)
      params.push((data as any)[field])
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = datetime(\'now\', \'localtime\')')
    params.push(id)
    db.prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  }
  return getSupplier(id)!
}

export function deleteSupplier(id: number): boolean {
  const db = getDatabase()
  return db.prepare('DELETE FROM suppliers WHERE id = ?').run(id).changes > 0
}

export function getAllSuppliers(): Supplier[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all() as Supplier[]
}
