import { getDatabase } from '../database/connection'

export interface Product {
  id: number
  product_code: string
  name: string
  category_id: number | null
  category_name?: string
  brand: string | null
  quantity: number
  cost_price: number
  sale_price: number
  low_stock_threshold: number
  supplier_id: number | null
  supplier_name?: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ProductFilters {
  search?: string
  category_id?: number
  supplier_id?: number
  low_stock?: boolean
  page?: number
  limit?: number
}

export function getProducts(filters: ProductFilters = {}): { products: Product[]; total: number } {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []

  if (filters.search) {
    conditions.push('(p.name LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?)')
    const searchTerm = `%${filters.search}%`
    params.push(searchTerm, searchTerm, searchTerm)
  }
  if (filters.category_id) {
    conditions.push('p.category_id = ?')
    params.push(filters.category_id)
  }
  if (filters.supplier_id) {
    conditions.push('p.supplier_id = ?')
    params.push(filters.supplier_id)
  }
  if (filters.low_stock) {
    conditions.push('p.quantity <= p.low_stock_threshold')
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit || 50
  const offset = ((filters.page || 1) - 1) * limit

  const total = db.prepare(`SELECT COUNT(*) as count FROM products p ${where}`).get(...params) as { count: number }

  const products = db.prepare(`
    SELECT p.*, 
           c.name as category_name, 
           s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    ${where} 
    ORDER BY p.name ASC 
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Product[]

  return { products, total: total.count }
}

export function getProduct(id: number): Product | null {
  const db = getDatabase()
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    WHERE p.id = ?
  `).get(id) as Product | undefined
  return product || null
}

export function createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category_name' | 'supplier_name'>): Product {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO products (product_code, name, category_id, brand, quantity, cost_price, sale_price, low_stock_threshold, supplier_id, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.product_code, data.name, data.category_id, data.brand,
    data.quantity, data.cost_price, data.sale_price, data.low_stock_threshold,
    data.supplier_id, data.description
  )
  return getProduct(result.lastInsertRowid as number)!
}

export function updateProduct(id: number, data: Partial<Product>): Product {
  const db = getDatabase()
  const fields: string[] = []
  const params: any[] = []

  const allowedFields = ['product_code', 'name', 'category_id', 'brand', 'quantity', 'cost_price', 'sale_price', 'low_stock_threshold', 'supplier_id', 'description']

  for (const field of allowedFields) {
    if (field in data) {
      fields.push(`${field} = ?`)
      params.push((data as any)[field])
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = datetime(\'now\', \'localtime\')')
    params.push(id)
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  }

  return getProduct(id)!
}

export function deleteProduct(id: number): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id)
  return result.changes > 0
}

export function getLowStockProducts(): Product[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    WHERE p.quantity <= p.low_stock_threshold 
    ORDER BY p.quantity ASC
  `).all() as Product[]
}

export function searchProducts(query: string): Product[] {
  const db = getDatabase()
  const searchTerm = `%${query}%`
  return db.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    WHERE p.name LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?
    ORDER BY p.name ASC 
    LIMIT 20
  `).all(searchTerm, searchTerm, searchTerm) as Product[]
}

export function updateStock(productId: number, quantityChange: number): void {
  const db = getDatabase()
  db.prepare('UPDATE products SET quantity = quantity + ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(quantityChange, productId)
}

export function getTotalProductCount(): number {
  const db = getDatabase()
  const result = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
  return result.count
}
