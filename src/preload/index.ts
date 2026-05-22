import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Auth
  auth: {
    login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
    changePassword: (userId: number, oldPassword: string, newPassword: string) => ipcRenderer.invoke('auth:change-password', userId, oldPassword, newPassword),
    getUsers: () => ipcRenderer.invoke('auth:get-users'),
    createUser: (username: string, password: string, role: string, fullName: string) => ipcRenderer.invoke('auth:create-user', username, password, role, fullName)
  },

  // Products
  products: {
    list: (filters?: any) => ipcRenderer.invoke('products:list', filters),
    get: (id: number) => ipcRenderer.invoke('products:get', id),
    create: (data: any) => ipcRenderer.invoke('products:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
    search: (query: string) => ipcRenderer.invoke('products:search', query),
    lowStock: () => ipcRenderer.invoke('products:low-stock'),
    totalCount: () => ipcRenderer.invoke('products:total-count')
  },

  // Categories
  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    create: (name: string, description?: string) => ipcRenderer.invoke('categories:create', name, description),
    update: (id: number, name: string, description?: string) => ipcRenderer.invoke('categories:update', id, name, description),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id)
  },

  // Invoices
  invoices: {
    list: (filters?: any) => ipcRenderer.invoke('invoices:list', filters),
    get: (id: number) => ipcRenderer.invoke('invoices:get', id),
    create: (data: any) => ipcRenderer.invoke('invoices:create', data),
    cancel: (id: number) => ipcRenderer.invoke('invoices:cancel', id),
    todaySales: () => ipcRenderer.invoke('invoices:today-sales'),
    monthlySales: () => ipcRenderer.invoke('invoices:monthly-sales')
  },

  // Customers
  customers: {
    list: (filters?: any) => ipcRenderer.invoke('customers:list', filters),
    all: () => ipcRenderer.invoke('customers:all'),
    get: (id: number) => ipcRenderer.invoke('customers:get', id),
    create: (data: any) => ipcRenderer.invoke('customers:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('customers:delete', id),
    history: (id: number) => ipcRenderer.invoke('customers:history', id)
  },

  // Suppliers
  suppliers: {
    list: (filters?: any) => ipcRenderer.invoke('suppliers:list', filters),
    all: () => ipcRenderer.invoke('suppliers:all'),
    get: (id: number) => ipcRenderer.invoke('suppliers:get', id),
    create: (data: any) => ipcRenderer.invoke('suppliers:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('suppliers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id)
  },

  // Repairs
  repairs: {
    list: (filters?: any) => ipcRenderer.invoke('repairs:list', filters),
    get: (id: number) => ipcRenderer.invoke('repairs:get', id),
    create: (data: any) => ipcRenderer.invoke('repairs:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('repairs:update', id, data),
    updateStatus: (id: number, status: string) => ipcRenderer.invoke('repairs:update-status', id, status),
    delete: (id: number) => ipcRenderer.invoke('repairs:delete', id),
    summary: () => ipcRenderer.invoke('repairs:summary')
  },

  // Reports
  reports: {
    dailySales: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:daily-sales', dateFrom, dateTo),
    monthlySales: (year: number) => ipcRenderer.invoke('reports:monthly-sales', year),
    stock: () => ipcRenderer.invoke('reports:stock'),
    profit: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:profit', dateFrom, dateTo),
    repairs: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:repairs', dateFrom, dateTo)
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: Record<string, string>) => ipcRenderer.invoke('settings:update', settings),
    backup: () => ipcRenderer.invoke('settings:backup'),
    restore: () => ipcRenderer.invoke('settings:restore')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
