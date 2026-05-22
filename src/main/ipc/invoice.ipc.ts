import { ipcMain } from 'electron'
import * as invoiceService from '../services/invoice.service'

export function registerInvoiceIpc(): void {
  ipcMain.handle('invoices:list', async (_event, filters) => {
    try {
      return { success: true, ...invoiceService.getInvoices(filters) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('invoices:get', async (_event, id: number) => {
    try {
      const invoice = invoiceService.getInvoice(id)
      return invoice ? { success: true, invoice } : { success: false, error: 'Invoice not found' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('invoices:create', async (_event, data) => {
    try {
      const invoice = invoiceService.createInvoice(data)
      return { success: true, invoice }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('invoices:cancel', async (_event, id: number) => {
    try {
      const result = invoiceService.cancelInvoice(id)
      return { success: result, error: result ? undefined : 'Invoice not found or already cancelled' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('invoices:today-sales', async () => {
    try {
      return { success: true, ...invoiceService.getTodaySales() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('invoices:monthly-sales', async () => {
    try {
      return { success: true, ...invoiceService.getMonthlySales() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
