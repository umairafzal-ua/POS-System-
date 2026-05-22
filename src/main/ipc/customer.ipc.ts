import { ipcMain } from 'electron'
import * as customerService from '../services/customer.service'

export function registerCustomerIpc(): void {
  ipcMain.handle('customers:list', async (_event, filters) => {
    try {
      return { success: true, ...customerService.getCustomers(filters) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:all', async () => {
    try {
      return { success: true, customers: customerService.getAllCustomers() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:get', async (_event, id: number) => {
    try {
      const customer = customerService.getCustomer(id)
      return customer ? { success: true, customer } : { success: false, error: 'Customer not found' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:create', async (_event, data) => {
    try {
      const customer = customerService.createCustomer(data)
      return { success: true, customer }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:update', async (_event, id: number, data) => {
    try {
      const customer = customerService.updateCustomer(id, data)
      return { success: true, customer }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:delete', async (_event, id: number) => {
    try {
      const result = customerService.deleteCustomer(id)
      return { success: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:history', async (_event, id: number) => {
    try {
      const history = customerService.getCustomerHistory(id)
      return { success: true, history }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
