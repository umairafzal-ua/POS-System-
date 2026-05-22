import { getDatabase, backupDatabase, getDbPath } from '../database/connection'
import { dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'

export function getSettings(): Record<string, string> {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
}

export function getSetting(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value || null
}

export function updateSettings(settings: Record<string, string>): Record<string, string> {
  const db = getDatabase()
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

  db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, value)
    }
  })()

  return getSettings()
}

export async function backupDatabaseDialog(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Backup Database',
      defaultPath: path.join(app.getPath('desktop'), `workshop-backup-${new Date().toISOString().split('T')[0]}.db`),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' }
    }

    backupDatabase(result.filePath)
    return { success: true, path: result.filePath }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function restoreDatabaseDialog(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Restore Database',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' }
    }

    const sourcePath = result.filePaths[0]
    const destPath = getDbPath()

    // Create a backup of current DB first
    const backupPath = destPath + '.bak'
    if (fs.existsSync(destPath)) {
      fs.copyFileSync(destPath, backupPath)
    }

    fs.copyFileSync(sourcePath, destPath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
