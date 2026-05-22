import { ipcMain } from 'electron'
import * as repairService from '../services/repair.service'

export function registerRepairIpc(): void {
  ipcMain.handle('repairs:list', async (_event, filters) => {
    try {
      return { success: true, ...repairService.getRepairJobs(filters) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('repairs:get', async (_event, id: number) => {
    try {
      const job = repairService.getRepairJob(id)
      return job ? { success: true, job } : { success: false, error: 'Repair job not found' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('repairs:create', async (_event, data) => {
    try {
      const job = repairService.createRepairJob(data)
      return { success: true, job }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('repairs:update', async (_event, id: number, data) => {
    try {
      const job = repairService.updateRepairJob(id, data)
      return { success: true, job }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('repairs:update-status', async (_event, id: number, status: string) => {
    try {
      const job = repairService.updateRepairStatus(id, status)
      return { success: true, job }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('repairs:delete', async (_event, id: number) => {
    try {
      const result = repairService.deleteRepairJob(id)
      return { success: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('repairs:summary', async () => {
    try {
      return { success: true, summary: repairService.getRepairSummary() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
