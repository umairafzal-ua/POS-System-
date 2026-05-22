import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

let db: Database.Database | null = null

export function getDbPath(): string {
  if (app.isPackaged) {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'shop.db')
  }
  return path.join(__dirname, '../../database/shop.db')
}

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()

  // Ensure directory exists
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function backupDatabase(destinationPath: string): void {
  const database = getDatabase()
  database.backup(destinationPath)
}
