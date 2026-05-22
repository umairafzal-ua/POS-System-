import { ipcMain } from 'electron'
import * as authService from '../services/auth.service'

export function registerAuthIpc(): void {
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    try {
      const user = authService.login(username, password)
      if (!user) return { success: false, error: 'Invalid username or password' }
      return { success: true, user }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:change-password', async (_event, userId: number, oldPassword: string, newPassword: string) => {
    try {
      const result = authService.changePassword(userId, oldPassword, newPassword)
      if (!result) return { success: false, error: 'Current password is incorrect' }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:get-users', async () => {
    try {
      return { success: true, users: authService.getUsers() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:create-user', async (_event, username: string, password: string, role: string, fullName: string) => {
    try {
      const user = authService.createUser(username, password, role, fullName)
      return { success: true, user }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
