import { ipcMain } from 'electron'
import * as supplierService from '../services/supplier.service'

export function registerSupplierIpc(): void {
  ipcMain.handle('suppliers:list', async (_event, filters) => {
    try {
      return { success: true, ...supplierService.getSuppliers(filters) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:all', async () => {
    try {
      return { success: true, suppliers: supplierService.getAllSuppliers() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:get', async (_event, id: number) => {
    try {
      const supplier = supplierService.getSupplier(id)
      return supplier ? { success: true, supplier } : { success: false, error: 'Supplier not found' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:create', async (_event, data) => {
    try {
      const supplier = supplierService.createSupplier(data)
      return { success: true, supplier }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:update', async (_event, id: number, data) => {
    try {
      const supplier = supplierService.updateSupplier(id, data)
      return { success: true, supplier }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:delete', async (_event, id: number) => {
    try {
      const result = supplierService.deleteSupplier(id)
      return { success: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
