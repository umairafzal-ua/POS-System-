import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Database
import { runMigrations } from './database/migrations'
import { seedDatabase } from './database/seed'
import { closeDatabase } from './database/connection'

// IPC Handlers
import { registerAuthIpc } from './ipc/auth.ipc'
import { registerProductIpc } from './ipc/product.ipc'
import { registerInvoiceIpc } from './ipc/invoice.ipc'
import { registerCustomerIpc } from './ipc/customer.ipc'
import { registerSupplierIpc } from './ipc/supplier.ipc'
import { registerRepairIpc } from './ipc/repair.ipc'
import { registerReportIpc } from './ipc/report.ipc'
import { registerSettingsIpc } from './ipc/settings.ipc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Workshop POS - Motor Bike Spare Parts',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer in dev, otherwise load from build
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Initialize app
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.workshop.pos')

  // Initialize database
  console.log('Initializing database...')
  runMigrations()
  // seedDatabase() // Disabled for production
  console.log('Database ready.')

  // Register all IPC handlers
  registerAuthIpc()
  registerProductIpc()
  registerInvoiceIpc()
  registerCustomerIpc()
  registerSupplierIpc()
  registerRepairIpc()
  registerReportIpc()
  registerSettingsIpc()

  // Default open or close DevTools by F12 in dev
  // and ignore CommandOrControl + R in production
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
