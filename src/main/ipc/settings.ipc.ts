import { ipcMain } from 'electron'
import * as settingsService from '../services/settings.service'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = settingsService.getSettings()
      return { success: true, settings }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:update', async (_event, settings: Record<string, string>) => {
    try {
      const updated = settingsService.updateSettings(settings)
      return { success: true, settings: updated }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:backup', async () => {
    try {
      return await settingsService.backupDatabaseDialog()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:restore', async () => {
    try {
      return await settingsService.restoreDatabaseDialog()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
