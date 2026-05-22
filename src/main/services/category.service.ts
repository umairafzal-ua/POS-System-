import { getDatabase } from '../database/connection'

export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string
  product_count?: number
}

export function getCategories(): Category[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count 
    FROM categories c 
    LEFT JOIN products p ON p.category_id = c.id 
    GROUP BY c.id 
    ORDER BY c.name
  `).all() as Category[]
}

export function createCategory(name: string, description?: string): Category {
  const db = getDatabase()
  const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null)
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category
}

export function updateCategory(id: number, name: string, description?: string): Category {
  const db = getDatabase()
  db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description || null, id)
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category
}

export function deleteCategory(id: number): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  return result.changes > 0
}
