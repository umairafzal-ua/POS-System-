import { getDatabase } from '../database/connection'
import crypto from 'crypto'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export interface User {
  id: number
  username: string
  role: string
  full_name: string
  is_active: number
  created_at: string
}

export function login(username: string, password: string): User | null {
  const db = getDatabase()
  const hash = hashPassword(password)
  const user = db
    .prepare('SELECT id, username, role, full_name, is_active, created_at FROM users WHERE username = ? AND password_hash = ? AND is_active = 1')
    .get(username, hash) as User | undefined
  return user || null
}

export function changePassword(userId: number, oldPassword: string, newPassword: string): boolean {
  const db = getDatabase()
  const oldHash = hashPassword(oldPassword)
  const user = db.prepare('SELECT id FROM users WHERE id = ? AND password_hash = ?').get(userId, oldHash)
  if (!user) return false

  const newHash = hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(newHash, userId)
  return true
}

export function getUsers(): User[] {
  const db = getDatabase()
  return db.prepare('SELECT id, username, role, full_name, is_active, created_at FROM users').all() as User[]
}

export function createUser(username: string, password: string, role: string, fullName: string): User {
  const db = getDatabase()
  const hash = hashPassword(password)
  const result = db
    .prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)')
    .run(username, hash, role, fullName)
  return db.prepare('SELECT id, username, role, full_name, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as User
}
