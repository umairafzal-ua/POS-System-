"use strict";
const electron = require("electron");
const api = {
  // Auth
  auth: {
    login: (username, password) => electron.ipcRenderer.invoke("auth:login", username, password),
    changePassword: (userId, oldPassword, newPassword) => electron.ipcRenderer.invoke("auth:change-password", userId, oldPassword, newPassword),
    getUsers: () => electron.ipcRenderer.invoke("auth:get-users"),
    createUser: (username, password, role, fullName) => electron.ipcRenderer.invoke("auth:create-user", username, password, role, fullName)
  },
  // Products
  products: {
    list: (filters) => electron.ipcRenderer.invoke("products:list", filters),
    get: (id) => electron.ipcRenderer.invoke("products:get", id),
    create: (data) => electron.ipcRenderer.invoke("products:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("products:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("products:delete", id),
    search: (query) => electron.ipcRenderer.invoke("products:search", query),
    lowStock: () => electron.ipcRenderer.invoke("products:low-stock"),
    totalCount: () => electron.ipcRenderer.invoke("products:total-count")
  },
  // Categories
  categories: {
    list: () => electron.ipcRenderer.invoke("categories:list"),
    create: (name, description) => electron.ipcRenderer.invoke("categories:create", name, description),
    update: (id, name, description) => electron.ipcRenderer.invoke("categories:update", id, name, description),
    delete: (id) => electron.ipcRenderer.invoke("categories:delete", id)
  },
  // Invoices
  invoices: {
    list: (filters) => electron.ipcRenderer.invoke("invoices:list", filters),
    get: (id) => electron.ipcRenderer.invoke("invoices:get", id),
    create: (data) => electron.ipcRenderer.invoke("invoices:create", data),
    cancel: (id) => electron.ipcRenderer.invoke("invoices:cancel", id),
    todaySales: () => electron.ipcRenderer.invoke("invoices:today-sales"),
    monthlySales: () => electron.ipcRenderer.invoke("invoices:monthly-sales")
  },
  // Customers
  customers: {
    list: (filters) => electron.ipcRenderer.invoke("customers:list", filters),
    all: () => electron.ipcRenderer.invoke("customers:all"),
    get: (id) => electron.ipcRenderer.invoke("customers:get", id),
    create: (data) => electron.ipcRenderer.invoke("customers:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("customers:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("customers:delete", id),
    history: (id) => electron.ipcRenderer.invoke("customers:history", id)
  },
  // Suppliers
  suppliers: {
    list: (filters) => electron.ipcRenderer.invoke("suppliers:list", filters),
    all: () => electron.ipcRenderer.invoke("suppliers:all"),
    get: (id) => electron.ipcRenderer.invoke("suppliers:get", id),
    create: (data) => electron.ipcRenderer.invoke("suppliers:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("suppliers:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("suppliers:delete", id)
  },
  // Repairs
  repairs: {
    list: (filters) => electron.ipcRenderer.invoke("repairs:list", filters),
    get: (id) => electron.ipcRenderer.invoke("repairs:get", id),
    create: (data) => electron.ipcRenderer.invoke("repairs:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("repairs:update", id, data),
    updateStatus: (id, status) => electron.ipcRenderer.invoke("repairs:update-status", id, status),
    delete: (id) => electron.ipcRenderer.invoke("repairs:delete", id),
    summary: () => electron.ipcRenderer.invoke("repairs:summary")
  },
  // Reports
  reports: {
    dailySales: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:daily-sales", dateFrom, dateTo),
    monthlySales: (year) => electron.ipcRenderer.invoke("reports:monthly-sales", year),
    stock: () => electron.ipcRenderer.invoke("reports:stock"),
    profit: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:profit", dateFrom, dateTo),
    repairs: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:repairs", dateFrom, dateTo)
  },
  // Settings
  settings: {
    get: () => electron.ipcRenderer.invoke("settings:get"),
    update: (settings) => electron.ipcRenderer.invoke("settings:update", settings),
    backup: () => electron.ipcRenderer.invoke("settings:backup"),
    restore: () => electron.ipcRenderer.invoke("settings:restore")
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
