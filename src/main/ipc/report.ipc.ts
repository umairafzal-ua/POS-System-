import { ipcMain } from 'electron'
import * as reportService from '../services/report.service'

export function registerReportIpc(): void {
  ipcMain.handle('reports:daily-sales', async (_event, dateFrom: string, dateTo: string) => {
    try {
      const report = reportService.getDailySalesReport(dateFrom, dateTo)
      return { success: true, report }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('reports:monthly-sales', async (_event, year: number) => {
    try {
      const report = reportService.getMonthlySalesReport(year)
      return { success: true, report }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('reports:stock', async () => {
    try {
      const report = reportService.getStockReport()
      return { success: true, report }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('reports:profit', async (_event, dateFrom: string, dateTo: string) => {
    try {
      const report = reportService.getProfitReport(dateFrom, dateTo)
      return { success: true, report }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('reports:repairs', async (_event, dateFrom: string, dateTo: string) => {
    try {
      const report = reportService.getRepairsReport(dateFrom, dateTo)
      return { success: true, report }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
